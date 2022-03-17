import axios from 'axios'
import config from '@/libs/config'

let domain = ''
switch (config.getNetwork()) {
    case 'testnet':
        domain = 'https://testnet.butcoin.tech'
        break
    case 'mainnet':
        domain = 'https://explorer.butcoin.tech'
        break
}
const apiPrefix = domain + '/insight-api'

const _get = async url => {
    return (await axios.get(apiPrefix + url)).data
}

const _post = async(url, data) => {
    return (await axios.post(apiPrefix + url, data)).data
}

export default {
    async getInfo(address) {
        return await _get(`/addr/${address}`)
    },

    async getTxList(address) {
        return await _get(`/txs/?address=${address}`)
    },

    async getUtxoList(address) {
        return (await _get(`/addr/${address}/utxo`)).map(item => {
            return {
                address: item.address,
                txid: item.txid,
                confirmations: item.confirmations,
                amount: item.amount,
                value: item.satoshis,
                hash: item.txid,
                pos: item.vout
            }
        })
    },

    async sendRawTx(rawTx) {
        return (await _post('/tx/send', { rawtx: rawTx })).txid
    },

    async fetchRawTx(txid) {
        return (await _get(`/rawtx/${txid}`)).rawtx
    },

    getTxExplorerUrl(tx) {
        return `${domain}/tx/${tx}`
    },

    getAddrExplorerUrl(addr) {
        return `${domain}/address/${addr}`
    }
}
