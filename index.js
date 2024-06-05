const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const fs = require('fs')
const port = 3000
const { Transaction, Script, PrivateKey, OP, Random, P2PKH, ARC, MerklePath, WhatsOnChain } = require('@bsv/sdk')

const blockHeaderService = new WhatsOnChain()
const key = PrivateKey.fromWif('KxGXqAFxDashKbabVixgitydELRehTJkq7HCEowFniqrrAi3DXFx')
app.use(bodyParser.json())

app.get('/api/submit', async (req, res) => {
    const lockingScript = new Script()
    lockingScript.writeNumber(Random(1)[0])
    lockingScript.writeOpCode(OP.OP_DROP)
    lockingScript.writeScript(new P2PKH().lock(key.toAddress()))

    // grab the first file in the directory and use it as the source transaction
    const spendTxid = fs.readdirSync('./transactions')[0]
    const sourceTransacion = Transaction.fromBinary(fs.readFileSync(spendTxid))

    const tx = new Transaction()
    tx.addInput({
        sourceTransaction,
        sourceOutputIndex: 0,
        unlockingScriptTemplate: new P2PKH().unlock(key)
    })
    tx.addOutput({
        change: true,
        lockingScript
    })
    await tx.fee()
    await tx.sign()


    const arc = new ARC('https://arc.taal.com', {
        headers: {
            'X-CallbackUrl': 'https://fcc9878a3a3c.ngrok.app/api/callback'
        }
    })

    const response = await tx.broadcast(arc)

    if (!!response.txid) {
        // create new file with the transaction
        fs.writeFileSync(`./transactions/${tx.id('hex')}`, Buffer.from(tx.toBinary()))
        // remove source Transactions
        fs.unlinkSync(`./transactions/${sourceTransacion.id('hex')}`)
    }

    res.send(txid)
})

app.get('/api/spent/:txid/:vout', (req, res) => {
    const txid = req.params.txid
    const vout = req.params.vout


    // load list of all beef files
    const beefs = fs.readdirSync('/beef')
    const txs = fs.readdirSync('/transactions')
    const transactions = []
    let exists = false
    let spent
    for (const file of beefs) {
        if (file === txid) exists = true
        const tx = Transaction.fromBEEF(fs.readFileSync(file))
        if (tx.inputs.some(input => input.sourceTransaction.id('hex') === txid && input.sourceOutputIndex === vout)) {
            exists = true
            spent = tx.id('hex')
            break
        }
        transactions.push(tx)
    }
    if (typeof spent === 'undefined') {
        for (const file of txs) {
            if (file === txid) exists = true
            const tx = Transaction.fromBinary(fs.readFileSync(file))
            if (tx.inputs.some(input => input.sourceTXID === txid && input.sourceOutputIndex === vout)) {
                exists = true
                spent = tx.id('hex')
                break
            }
            transactions.push(tx)
        }
    }
    
    res.send({ exists, spent })
})

app.post('/api/callback', async (req, res) => {
    if (req.body.txStatus === 'MINED') {
        const tx = Transaction.fromBinary(fs.readFileSync(`/transactions/${req.body.txid}`))
        tx.merklePath = MerklePath.fromHex(req.body.merklePath)

        const valid = await tx.verify(blockHeaderService)

        const beef = tx.toBEEF()
        const f = fs.createWriteStream(`/beef/${req.body.txid}`)
        f.write(beef)
        console.log(req.body.txid, ' was mined, and saved to BEEF, and is ', valid ? 'valid' : 'invalid')
    } else {
        console.log(req.body)
    }
    res.status(200).send('ok')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
