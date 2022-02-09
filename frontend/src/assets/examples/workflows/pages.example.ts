export const pagesExample =
  `- workflow: Pages

- page:
    - pageName: Register
    - text: Please register yourself
    - input: E-Mail
    - input: Username
    - password: Password
    - password: Repeat Password
    - button: Register
      targetPage: RegisterFilled

- page:
    - pageName: RegisterFilled
    - text: Please register yourself
    - input: E-Mail
      fill: test@test.com
    - input: Username
      fill: Carli
    - password: Password
      fill: 1234
    - password: Repeat Password
      fill: 1234
    - button: Register
      targetPage: Login

- page:
    - pageName: Login
    - text: Welcome back
    - input: Username/E-Mail
    - password: Password
    - button: Login
      targetPage: LoginFilled

- page:
    - pageName: LoginFilled
    - text: Welcome back
    - input: Username/E-Mail
      fill: Carli
    - password: Password
      fill: 1234
    - button: Login
      targetPage: Overview1

- page:
    - pageName: Overview1
    - text: Your current Purchases
    - button: Add Purchase
      targetPage: AddPurchase1
    - button: Logout
      targetPage: Logout

- page:
    - pageName: AddPurchase1
    - text: New Purchase
    - input: Item
    - input: Amount
    - button: Buy
      targetPage: AddPurchase1Filled

- page:
    - pageName: AddPurchase1Filled
    - text: New Purchase
    - input: Item
      fill: T-Shirt
    - input: Amount
      fill: 100
    - button: Buy
      targetPage: Overview2

- page:
    - pageName: Overview2
    - text: Your current Purchases
    - text: T-Shirt x100
    - button: Add Purchase
      targetPage: AddPurchase2
    - button: Logout
      targetPage: Logout

- page:
    - pageName: AddPurchase2
    - text: New Purchase
    - input: Item
    - input: Amount
    - button: Buy
      targetPage: AddPurchase2Filled

- page:
    - pageName: AddPurchase2Filled
    - text: New Purchase
    - input: Item
      fill: Jeans
    - input: Amount
      fill: 50
    - button: Buy
      targetPage: Overview3

- page:
    - pageName: Overview3
    - text: Your current Purchases
    - text: T-Shirt x100
    - text: Jeans x50
    - button: Add Purchase
    - button: Logout
      targetPage: Logout

- page:
    - pageName: Logout
    - text: See you soon
    - button: Back to login
      targetPage: Login
`;
