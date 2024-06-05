const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const fs = require('fs')
const port = 3000
const { Transaction, Script, PrivateKey, OP, Random, P2PKH, ARC, MerklePath, WhatsOnChain } = require('@bsv/sdk')

const env = {
    callbackUrl: 'https://fcc9878a3a3c.ngrok.app/api/callback',
    wif: 'KxGXqAFxDashKbabVixgitydELRehTJkq7HCEowFniqrrAi3DXFx',
}

const blockHeaderService = new WhatsOnChain()
const key = PrivateKey.fromWif(env.wif)
console.log({ spendingFrom: key.toAddress() })

app.use(bodyParser.json())

app.get('/api/submit', async (req, res) => {
    try {
        const lockingScript = new Script()
        lockingScript.writeBin(Random(1))
        lockingScript.writeOpCode(OP.OP_DROP)
        lockingScript.writeScript(new P2PKH().lock(key.toAddress()))

        // grab the first file in the directory and use it as the source transaction
        const spendTxid = fs.readdirSync('./transactions')[0]
        const sourceTransaction = Transaction.fromBinary(fs.readFileSync('./transactions/' + spendTxid))

        const tx = new Transaction()
        tx.addInput({
            sourceTransaction,
            sourceOutputIndex: 0,
            unlockingScriptTemplate: new P2PKH().unlock(key),
        })
        tx.addOutput({
            change: true,
            lockingScript,
        })
        await tx.fee()
        await tx.sign()

        console.log({ tx: tx.toHex() })

        const arc = new ARC('https://arc.taal.com', {
            headers: {
                'X-CallbackUrl': env.callbackUrl,
            },
        })

        const response = await tx.broadcast(arc)

        console.log({ response })

        if (!!response.txid) {
            // create new file with the transaction
            fs.writeFileSync(`./transactions/${tx.id('hex')}`, Buffer.from(tx.toBinary()))
            // remove source Transactions
            fs.unlinkSync(`./transactions/${sourceTransaction.id('hex')}`)
        }

        res.status(200).send(response.txid)
    } catch (error) {
        console.error({ error })
        res.status(500).send(error.message)
    }
})

app.get('/api/spent/:txid/:vout', (req, res) => {
    try {
        const txid = req.params.txid
        const vout = req.params.vout

        // load list of all beef files
        const beefs = fs.readdirSync('./beef')
        const txs = fs.readdirSync('./transactions')
        const transactions = []
        let exists = false
        let spentTxid
        for (const file of beefs) {
            if (file === txid) exists = true
            const tx = Transaction.fromBEEF(fs.readFileSync('./beef/' + file))
            if (
                tx.inputs.some(input => input.sourceTransaction.id('hex') === txid && input.sourceOutputIndex === vout)
            ) {
                exists = true
                spentTxid = tx.id('hex')
                break
            }
            transactions.push(tx)
        }
        if (typeof spentTxid === 'undefined') {
            for (const file of txs) {
                if (file === txid) exists = true
                const tx = Transaction.fromBinary(fs.readFileSync('./transactions/' + file))
                if (
                    tx.inputs.some(input => {
                        console.log({ sourceTXID: input.sourceTXID })
                        return input.sourceTXID === txid && input.sourceOutputIndex === Number(vout)
                    })
                ) {
                    exists = true
                    spentTxid = tx.id('hex')
                    break
                }
                transactions.push(tx)
            }
        }

        res.status(200).send({ exists, spentTxid })
    } catch (error) {
        console.error({ error })
        res.status(500).send(error.message)
    }
})

app.post('/api/callback', async (req, res) => {
    try {
        if (req.body.txStatus === 'MINED') {
            const tx = Transaction.fromBinary(fs.readFileSync(`./transactions/${req.body.txid}`))
            tx.merklePath = MerklePath.fromHex(req.body.merklePath)

            const valid = await tx.verify(blockHeaderService)

            const f = fs.writeFileSync(`./beef/${req.body.txid}`, Buffer.from(tx.toBEEF()))
            console.log(req.body.txid, ' was mined, and saved to BEEF, and is ', valid ? 'valid' : 'invalid')
        } else {
            console.log(req.body)
        }
        res.status(200).send('ok')
    } catch (error) {
        console.error({ error })
        res.status(500).send(error.message)
    }
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
