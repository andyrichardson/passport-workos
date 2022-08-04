import { Strategy } from "passport";
import { Request } from "express";
import WorkOS, { Profile } from "@workos-inc/node";

export type WorkOSSSOStrategyOptions = {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
};

type WorkOSSSOStrategyVerifyFn = (
  req: Request,
  accessToken: string,
  refreshToken: string | undefined,
  profile: Profile,
  cb: (err: unknown, user: Profile, info: any) => void
) => void;
type AuthenticateOptions = Partial<
  Parameters<WorkOS["sso"]["getAuthorizationURL"]>[0]
>;

export class WorkOSSSOStrategy extends Strategy {
  private client: WorkOS;
  private options: WorkOSSSOStrategyOptions;
  private verify: WorkOSSSOStrategyVerifyFn;

  constructor(
    opts: WorkOSSSOStrategyOptions,
    verify: WorkOSSSOStrategyVerifyFn
  ) {
    super();
    this.options = opts;
    this.verify = verify;
    this.client = new WorkOS(opts.clientSecret);
  }

  public authenticate(req: Request, options: AuthenticateOptions) {
    if (req.query?.code) {
      return this._loginCallback(req, options);
    }

    return this._loginAttempt(req, options);
  }

  private _loginAttempt(req: Request, options: AuthenticateOptions) {
    try {
      const { connection, domain, email, organization } = req.query as Record<
        string,
        string
      >;
      if (
        [connection, domain, email, organization].every((a) => a === undefined)
      ) {
        throw Error(
          "One of 'connection', 'domain', 'organization' and/or 'email' are required"
        );
      }

      const url = this.client.sso.getAuthorizationURL({
        ...req.body,
        connection,
        organization,
        domain: domain || email?.slice(email.indexOf("@") + 1),
        clientID: this.options.clientID,
        redirectURI: options.redirectURI || this.options.callbackURL,
        ...options,
      });
      this.redirect(url);
    } catch (err: any) {
      this.fail(err);
    }
  }

  private async _loginCallback(req: Request, _options: AuthenticateOptions) {
    try {
      const { profile, access_token } =
        await this.client.sso.getProfileAndToken({
          code: req.query.code as string,
          clientID: this.options.clientID,
        });

      this.verify(
        req,
        access_token,
        undefined /* no refresh token */,
        profile,
        (err: any, user: any, info: any) => {
          if (err) {
            return this.error(err);
          }

          if (!user) {
            return this.fail("no user");
          }

          return this.success(user, info);
        }
      );
    } catch (err: any) {
      if (err?.response?.data?.error === "invalid_grant") {
        return this.fail(err.response.data.error_description);
      }

      return this.error(err);
    }
  }
}
