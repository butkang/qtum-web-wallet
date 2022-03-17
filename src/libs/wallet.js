import qtum from 'qtumjs-lib'
import bip39 from 'bip39'
import abi from 'ethjs-abi'
import secp256k1 from 'secp256k1'
import BigNumber from 'bignumber.js'
import ledger from '@/libs/ledger'
import server from '@/libs/server'
import config from '@/libs/config'
import { sha256d } from '@/libs/hash'
import { Buffer } from 'buffer'

const unit = 'BUTK'
let network = {}
switch (config.getNetwork()) {
    case 'testnet':
        network = qtum.networks.qtum_testnet
        break
    case 'mainnet':
        network = qtum.networks.qtum
        break
}

const satPos = 16

export default class Wallet {
    constructor(keyPair, extend = {}) {
        this.keyPair = keyPair
        this.extend = extend
        this.info = {
            address: this.getAddress(),
            balance: 'loading',
            unconfirmedBalance: 'loading',
            qrc20: [],
            superStaker: '',
            fee: ''
        }
        this.txList = []
    }

    validateMnemonic(mnemonic, password) {
        let tempWallet = Wallet.restoreFromMnemonic(mnemonic, password)
        return this.keyPair.toWIF() === tempWallet.keyPair.toWIF()
    }

    getAddress() {
        return this.keyPair.getAddress()
    }

    getHasPrivKey() {
        return !!this.keyPair.d
    }

    getPrivKey() {
        try {
            return this.keyPair.toWIF()
        } catch (e) {
            if (e.toString() === 'Error: Missing private key') {
                return null
            } else {
                throw e
            }
        }
    }

    init() {
        if (config.getMode() !== 'offline') {
            this.setInfo().then()
            this.setTxList().then()
        }
    }

    async update() {
        const res = await Promise.all([this.setInfo(), this.setTxList()])
        return res
    }

    signMessage(message) {
        const hash = sha256d(
            Buffer.concat([
                Buffer.from(this.keyPair.network.messagePrefix, 'utf8'),
                Buffer.from([message.length]),
                Buffer.from(message, 'utf8')
            ])
        )
        const { signature, recovery } = secp256k1.sign(
            hash,
            this.keyPair.d.toBuffer()
        )
        return Buffer.concat([
            Buffer.from([recovery + (this.keyPair.compressed ? 31 : 27)]),
            signature
        ])
    }

    async setInfo() {
        const info = await server.currentNode().getInfo(this.info.address)
        this.info.balance = Wallet.changeUnitFromSatTo1(info.balance) + unit
        this.info.unconfirmedBalance =
            Wallet.changeUnitFromSatTo1(info.unconfirmed) + unit
        this.info.qrc20 = info.qrc20Balances.map(token => {
            token.balance = Wallet.changeUnitFromSatTo1(
                token.balance,
                token.decimals
            )
            return token
        })
    }

    async setTxList() {
        this.txList = await server.currentNode().getTxList(this.info.address)
    }


    async generateTx(to, amount, fee) {
        return await Wallet.generateTx(
            this,
            to,
            amount,
            fee,
            await server.currentNode().getUtxoList(this.info.address)
        )
    }

    async sendRawTx(tx) {
        const res = await Wallet.sendRawTx(tx)
        this.init()
        return res
    }

    validateAddress(address) {
      let reg
      switch (config.getNetwork()) {
        case 'testnet':
            reg = /^X\w{33}/g
            return reg.test(address)
        case 'mainnet':
            reg = /^X\w{33}/g
            return reg.test(address)
      }
      return false
    }

    static generateCreateTokenTx(
        wallet,
        name,
        symbol,
        decimal,
        totalSupply1,
        gasLimit,
        gasPrice,
        fee,
        utxoList
    ) {
        if (
            new BigNumber(totalSupply1)
            .times(new BigNumber(10).pow(decimal))
            .greaterThanOrEqualTo(new BigNumber(2).pow(256))
        ) {
            alert('Total supply is overflowed in uint256')
            return false
        }
        const encodedParam = abi.encodeParams(
            ['string', 'string', 'uint8', 'uint256'], [
                name,
                symbol,
                decimal,
                '0x' +
                new BigNumber(totalSupply1)
                .times(new BigNumber(10).pow(decimal))
                .toString(16)
            ]
        )
    }

    static async generateTx(wallet, to, amount, fee, utxoList) {
        if (!wallet.getHasPrivKey()) {
            if (wallet.extend.ledger) {
                return await ledger.generateTx(
                    wallet.keyPair,
                    wallet.extend.ledger.ledger,
                    wallet.extend.ledger.path,
                    wallet.info.address,
                    to,
                    amount,
                    fee,
                    utxoList,
                    server.currentNode().fetchRawTx
                )
            }
        }
        return qtum.utils.buildPubKeyHashTransaction(
            wallet.keyPair,
            to,
            amount,
            fee,
            utxoList
        )
    }

    static async sendRawTx(tx) {
        return await server.currentNode().sendRawTx(tx)
    }

    static validateBip39Mnemonic(mnemonic) {
        return bip39.validateMnemonic(mnemonic)
    }

    static restoreFromMnemonic(mnemonic, password) {
        //if (bip39.validateMnemonic(mnemonic) == false) return false
        const seedHex = bip39.mnemonicToSeedHex(mnemonic, password)
        const hdNode = qtum.HDNode.fromSeedHex(seedHex, network)
        const account = hdNode
            .deriveHardened(88)
            .deriveHardened(0)
            .deriveHardened(0)
        const keyPair = account.keyPair
        return new Wallet(keyPair)
    }

    static restoreFromMobile(mnemonic) {
        const seedHex = bip39.mnemonicToSeedHex(mnemonic)
        const hdNode = qtum.HDNode.fromSeedHex(seedHex, network)
        const account = hdNode.deriveHardened(88).deriveHardened(0)
        const walletList = []
        for (let i = 0; i < 10; i++) {
            const wallet = new Wallet(account.deriveHardened(i).keyPair)
            wallet.setInfo()
            walletList[i] = {
                wallet,
                path: i
            }
        }
        return walletList
    }

    static restoreFromWif(wif) {
        return new Wallet(qtum.ECPair.fromWIF(wif, network))
    }

    static async restoreHdNodeFromLedgerPath(ledger, path) {
        const res = await ledger.qtum.getWalletPublicKey(path)
        const compressed = ledger.qtum.compressPublicKey(
            Buffer.from(res['publicKey'], 'hex')
        )
        const keyPair = new qtum.ECPair.fromPublicKeyBuffer(compressed, network)
        const hdNode = new qtum.HDNode(
            keyPair,
            Buffer.from(res['chainCode'], 'hex')
        )
        hdNode.extend = {
            ledger: {
                ledger,
                path
            }
        }
        return hdNode
    }

    static restoreFromHdNodeByPage(hdNode, start, length = 10) {
        const walletList = []
        const extend = hdNode.extend
        for (let i = start; i < length + start; i++) {
            const wallet = new Wallet(hdNode.derive(i).keyPair, extend)
            wallet.setInfo()
            walletList[i] = {
                wallet,
                path: i
            }
        }
        return walletList
    }

    static generateMnemonic() {
        return bip39.generateMnemonic()
    }

    static async connectLedger() {
        return await ledger.connect()
    }

    static getLedgerDefaultPath() {
        return ledger.defaultPath
    }

    static changeUnitFromSatTo1(amountSat, pos = satPos) {
        const amountSatBig = new BigNumber(amountSat)
        return amountSatBig.div(Math.pow(10, pos)).toFormat()
    }

    static changeUnitFrom1ToSat(amount1, pos = satPos) {
        const amountBig = new BigNumber(amount1)
        return amountBig.times(Math.pow(10, pos)).toString()
    }
}
