# BoosterServer

**To run the server:**

```bash
npm install
npm run start
```

The server runs on port 3000. Please note that on startup, the server will download some very large files.

Currently working endpoints:

1. http://localhost:3000/sets <- Lists all sets.
2. http://localhost:3000/sets/{SETCODE}/products <- Given a setcode, returns all products for that set.
3. http://localhost:3000/products/{PRODUCTCODE}/open <- Given a product code, returns the contents of a booster pack.

## A special thanks to:

[MTGJSON](https://mtgjson.com/)

[scryfall](https://scryfall.com/)

[mtg.wtf](https://mtg.wtf/)

If any of you arrive on this page because I am pinging your API too much, please get in touch! I want to stress that I have no idea what I'm doing.
