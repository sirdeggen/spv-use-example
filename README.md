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
```bash
ngrok http 3000
```

Update line 9 of `index.js` replacing the placeholder ngrok with your own as seen in the response to ngrok command above. Keep the path after the domain.

