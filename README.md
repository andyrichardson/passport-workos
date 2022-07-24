<h1 align="center">Passport Workos</h1>
<p align="center"><i>A passport strategy for <a href="https://workos.com/docs/reference/sso">WorkOS SSO</a>.</i></p>

<p align="center">
  <img src="https://img.shields.io/github/checks-status/andyrichardson/passport-workos/master.svg" />
  <a href="https://npmjs.com/package/passport-workos">
    <img src="https://img.shields.io/github/package-json/v/andyrichardson/passport-workos.svg" alt="version" />
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

## Usage

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
    (req, accessToken, refreshToken, profile, done) => {
      return done(undefined, profile);
      // console.log(args);
    }
  )
);
```

Add a callback handler for your login route.

```ts
app.get("/login", passport.authenticate("workos"));
```

Add a callback handler for your callback route.

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

## Login route

The login route takes any of the arguments [specified here](https://workos.com/docs/reference/sso/authorize/get).

There's an additional `email` parameter which the strategy will, in turn, derive the `domain` value.
