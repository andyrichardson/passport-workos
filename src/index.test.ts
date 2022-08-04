import express from "express";
import expressSession from "express-session";
import passport from "passport";
import supertest from "supertest";
import { WorkOSSSOStrategy } from "./";

const clientID = "client_id";
const clientSecret = "api_key";
const callbackURL = "http://localhost:3000/auth/workos/callback";

const verify = jest.fn();

const strategy = new WorkOSSSOStrategy(
  {
    clientID,
    clientSecret,
    callbackURL,
  },
  verify
);
passport.use("workos", strategy);
passport.serializeUser(console.log);
passport.deserializeUser(console.log);

const app = express();
app.use(passport.initialize());

beforeEach(jest.clearAllMocks);

// WorkOS mocks
const getAuthorizationURL = jest.spyOn(
  strategy["client"].sso,
  "getAuthorizationURL"
);
const getProfileAndToken = jest.spyOn(
  strategy["client"].sso,
  "getProfileAndToken"
);

describe("on login", () => {
  beforeAll(() => {
    app.get(
      "/workos/authorize",
      passport.authenticate("workos", { session: false, state: "..." })
    );
  });

  beforeEach(() => {
    getAuthorizationURL.mockReturnValue("https://workos.com/fake-auth-url");
  });

  describe("on no query params", () => {
    it("passport.js throws unauthorized error", async () => {
      const res = await supertest(app).get("/workos/authorize");
      expect(res.statusCode).toEqual(401);
    });
  });

  describe("on connection", () => {
    const connection = "1234";
    const url = `/workos/authorize?connection=${connection}`;

    it("calls workos api with connection", async () => {
      await supertest(app).get(url);
      expect(getAuthorizationURL).toBeCalledTimes(1);
      expect(getAuthorizationURL).toBeCalledWith(
        expect.objectContaining({
          connection,
          clientID,
          redirectURI: callbackURL,
          state: "...",
        })
      );
    });

    it("redirects to login url", async () => {
      const res = await supertest(app).get(url);
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toMatchInlineSnapshot(
        `"https://workos.com/fake-auth-url"`
      );
    });
  });

  describe("on organization", () => {
    const organization = "1234";
    const url = `/workos/authorize?organization=${organization}`;

    it("calls workos api with organization", async () => {
      await supertest(app).get(url);
      expect(getAuthorizationURL).toBeCalledTimes(1);
      expect(getAuthorizationURL).toBeCalledWith(
        expect.objectContaining({
          organization,
          clientID,
          redirectURI: callbackURL,
          state: "...",
        })
      );
    });

    it("redirects to login url", async () => {
      const res = await supertest(app).get(url);
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toMatchInlineSnapshot(
        `"https://workos.com/fake-auth-url"`
      );
    });
  });

  describe("on domain", () => {
    const domain = "mydomain.org";
    const url = `/workos/authorize?domain=${domain}`;

    it("calls workos api with domain", async () => {
      await supertest(app).get(url);
      expect(getAuthorizationURL).toBeCalledTimes(1);
      expect(getAuthorizationURL).toBeCalledWith(
        expect.objectContaining({
          domain,
          clientID,
          redirectURI: callbackURL,
          state: "...",
        })
      );
    });

    it("redirects to login url", async () => {
      const res = await supertest(app).get(url);
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toMatchInlineSnapshot(
        `"https://workos.com/fake-auth-url"`
      );
    });
  });

  describe("on email", () => {
    const email = "user@mydomain.org";
    const url = `/workos/authorize?email=${email}`;

    it("calls workos api with domain", async () => {
      await supertest(app).get(url);
      expect(getAuthorizationURL).toBeCalledTimes(1);
      expect(getAuthorizationURL).toBeCalledWith(
        expect.objectContaining({
          domain: email.substring(email.indexOf("@") + 1),
          clientID,
          redirectURI: callbackURL,
          state: "...",
        })
      );
    });

    it("redirects to login url", async () => {
      const res = await supertest(app).get(url);
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toMatchInlineSnapshot(
        `"https://workos.com/fake-auth-url"`
      );
    });
  });
});

describe("on callback", () => {
  const code = "12345";
  const url = `/workos/callback?code=${code}`;
  const successCallback = jest.fn((_, res) => res.end());
  const accessToken = "access-token-mock";
  const profile = { id: 1234 } as any;

  beforeAll(() => {
    app.get(
      "/workos/callback",
      passport.authenticate("workos", {
        session: false,
      }),
      successCallback
    );
  });

  beforeEach(() => {
    verify.mockImplementation((_, __, ___, ____, cb) => cb());
    getProfileAndToken.mockImplementation(() =>
      Promise.resolve({
        profile,
        access_token: accessToken,
      })
    );
  });

  it("calls getProfileAndToken with code and clientID", async () => {
    await supertest(app).get(url);
    expect(getProfileAndToken).toBeCalledTimes(1);
    expect(getProfileAndToken).toBeCalledWith({
      code,
      clientID,
    });
  });

  describe("on invalid authorization code", () => {
    beforeEach(() => {
      getProfileAndToken.mockImplementation(() =>
        Promise.reject({
          response: {
            status: 400,
            data: {
              error: "invalid_grant",
              error_message: "The grant code provided is invalid",
            },
          },
        })
      );
    });

    it("passport.js throws unauthorized error", async () => {
      const res = await supertest(app).get(url);
      expect(res.statusCode).toEqual(401);
    });
  });

  describe("on workos error", () => {
    beforeEach(() => {
      getProfileAndToken.mockImplementation(() =>
        Promise.reject({
          response: {
            status: 400,
            data: {
              error: "invalid_client_secret",
              error_message: "The client secret provided is invalid",
            },
          },
        })
      );
    });

    it("passport.js throws unauthorized error", async () => {
      const res = await supertest(app).get(url);
      expect(res.statusCode).toEqual(500);
    });
  });

  describe("on unexpected error", () => {
    beforeEach(() => {
      getProfileAndToken.mockImplementation(() =>
        Promise.reject("Something went wrong")
      );
    });

    it("passport.js throws unauthorized error", async () => {
      const res = await supertest(app).get(url);
      expect(res.statusCode).toEqual(500);
    });
  });

  describe("on successful code verification", () => {
    it("calls verify function", async () => {
      await supertest(app).get(url);
      expect(verify).toBeCalledTimes(1);
      expect(verify).toBeCalledWith(
        expect.objectContaining({ url }),
        accessToken,
        undefined,
        profile,
        expect.any(Function)
      );
    });
  });

  describe("on user verify fn success", () => {
    beforeEach(() => {
      verify.mockImplementation((_, __, ___, user, cb) => cb(null, user));
    });

    it("forwards to next handler", async () => {
      await supertest(app).get(url);
      expect(successCallback).toBeCalledTimes(1);
    });
  });

  describe("on user verify fn error", () => {
    beforeEach(() => {
      verify.mockImplementation((_, __, ___, user, cb) => cb("error"));
    });

    it("throws error", async () => {
      const res = await supertest(app).get(url);
      expect(successCallback).toBeCalledTimes(0);
      expect(res.statusCode).toEqual(500);
    });
  });

  describe("on user verify fn not authorized", () => {
    beforeEach(() => {
      verify.mockImplementation((_, __, ___, user, cb) => cb(null, undefined));
    });

    it("passport.js throws unauthorized error", async () => {
      const res = await supertest(app).get(url);
      expect(res.statusCode).toEqual(401);
    });
  });
});
