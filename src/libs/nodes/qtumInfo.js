import axios from 'axios'
import config from '@/libs/config'
// todo change apis to qtum.info

let domain = ''

switch (config.getNetwork()) {
    case 'testnet':
        domain = 'https://testnet.qtum.i'
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
        return await _get(`/address/${address}`)
    },


    async getTxList(address, size = 10) {
        const res = await _get(`/address/${address}/txs?page=0&pageSize=${size}`)
        return Promise.all(res.transactions.map(tx => _get(`/tx/${tx}`)))
    },

    async getUtxoList(address) {
        return (await _get(`/address/${address}/utxo`)).map(item => {
            return {
                address: item.address,
                txid: item.transactionId,
                confirmations: item.confirmations,
                amount: item.value,
                value: item.value,
                hash: item.transactionId,
                pos: item.outputIndex
            }
        })
    },

    async sendRawTx(rawTx) {
        const res = await _post('/tx/send', `rawtx=${rawTx}`)
        return {
            txId: res.txid,
            message: res.message
        }
    },

    async fetchRawTx(txid) {
        return await _get(`/raw-tx/${txid}`)
    },

    getTxExplorerUrl(tx) {
        return `${domain}/tx/${tx}`
    },

    getAddrExplorerUrl(addr) {
        return `${domain}/address/${addr}`
    },

    async getQtumInfo() {
        return await _get('/info')
    }
}
