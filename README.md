# fulib.org

[![Build Status](https://travis-ci.org/fujaba/fulib.org.svg?branch=master)](https://travis-ci.org/fujaba/fulib.org)

A web app for [Fulib Scenarios](https://github.com/fujaba/fulibScenarios).
Available at https://www.fulib.org.

## Building & Running

### General

You can simplfy set up this project after cloning using the Gradle import feature of your IDE.

### MongoDB

Note that in order to run the server locally, you need to install MongoDB (server).
Then, create a user (with `mongosh`):

```js
db.createUser({
  user: "fulibDotOrg",
  pwd: "fulibDotOrg",
  roles: [
    { role: "readWrite", db: "fulib-org" }
  ]
})
```

> You can also select your own username and password.

Make sure you set the following environment variables before running:

```properties
FULIB_ORG_MONGODB_USER=fulibDotOrg
FULIB_ORG_MONGODB_HOST=localhost
FULIB_ORG_MONGODB_PASSWORD=fulibDotOrg
```

> If you selected a custom username and password in the step above,
> use them instead of `fulibDotOrg` in the env variables, too!

IntelliJ users can also use the predefined `Main` run configuration with the above environment variables already set.
