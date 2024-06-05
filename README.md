# Clone

```bash
git clone https://github.com/sirdeggen/spv-use-example.git
```

# Dependencies
This uses [ngrok](https://ngrok.com/) to get arc callbacks to your local machine, and [nodejs & npm](https://nodejs.org) to run, as well as the @bsv/sdk.

# Install
```bash
npm i
```

# Use

## Start ngrok
```bash
ngrok http 3000
```

Update line 9 of `index.js` replacing the placeholder ngrok with your own as seen in the response to ngrok command above. Keep the path after the domain.

## Start the express server

```bash
node index.js
```

## Submit a transaction
Hit the [submit endpoint](http://localhost:3000/api/submit) in browser to create a new transaction, and simply observe the console.

## Check the spend status
Check the [spent endpoint](http://localhost:3000/api/spent/6dcefc8cfd7f908021c3a15892c2a7e27d10fe89dba3a681fe6cfd95c7708d8c/0) for a specific utxo by setting the txid and vout to values associated with your transcation.

```javascript
let url = `http://localhost:3000/api/spent/${txid}/${vout}`
```