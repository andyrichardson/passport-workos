<h1 align="center">Passport Workos</h1>
<p align="center"><i>A passport strategy for <a href="https://workos.com/docs/reference/sso">WorkOS SSO</a>.</i></p>

<p align="center">
  <img src="https://img.shields.io/github/checks-status/andyrichardson/passport-workos/master.svg" />
  <a href="https://npmjs.com/package/passport-workos">
    <img src="https://img.shields.io/npm/v/passport-workos.svg" alt="version" />
  </a>
  <a href="https://bundlephobia.com/result?p=passport-workos">
    <img src="https://img.shields.io/bundlephobia/minzip/passport-workos.svg" alt="size" />
  </a>
  <a href="https://codecov.io/gh/andyrichardson/passport-workos">
    <img src="https://img.shields.io/codecov/c/github/andyrichardson/passport-workos.svg" alt="coverage">
  </a>
</p>

## Installation

```sh
npm i passport-workos passport @workos-inc/node
```

## Setup

Import the strategy.

```ts
import { WorkOSSSOStrategy } from "passport-workos";
```

Instantiate it with your WorkOS credentials, callbackURL, and verify function.

```ts
passport.use(
  "workos",
  new WorkOSSSOStrategy(
    {
      clientID: process.env.WORKOS_CLIENT_ID,
      clientSecret: process.env.WORKOS_API_KEY,
      callbackURL: "http://localhost:3000/auth/workos/callback",
    },
    // Verify function
    (req, accessToken, refreshToken, profile, done) => {
      return done(undefined, profile);
    }
  )
);
```

Add a route for redirecting to WorkOS login.

```ts
app.get("/auth/workos/login", passport.authenticate("workos"));
```

Add a route for code authorization callbacks.

```ts
app.get(
  "/auth/workos/callback",
  passport.authenticate("workos"),
  (req, res) => {
    // Do something once authenticated
    // ..
    res.redirect("/");
  }
);
```

## Consumption

### Login

The login route will redirect to a [WorkOS OAuth 2.0 authorization URL](https://workos.com/docs/reference/sso/get-authorization-url). When redirecting to this route, be sure to include one of the [supported query parameters](https://workos.com/docs/reference/sso/get-authorization-url).

#### Login with email

In the likely case where the connection can't be derived by the requesting client, middleware is advised ([see here](https://github.com/andyrichardson/passport-workos/pull/15#issuecomment-1300526716)).

```tsx
// Client entrypoint
app.use("/auth/email/login", (req, res, next) => {
  const email = req.query.email;
  // Your custom function to get connection for given email
  const connection = await getConnectionForEmail(email);

  // Redirect to passport strategy with supported args
  res.redirect(
    url.format({
      pathname: "/auth/workos/login",
      query: { ...req.query, connection, login_hint: email },
    })
  );
});

app.use("/auth/workos/login", passport.authenticate("workos"), (req, res) => {
  /* ... */
});
```

### Callback

This will be called by WorkOS after a successful login. Be sure to [configure the redirect URI](https://workos.com/docs/reference/sso/redirect-uri) with WorkOS.
