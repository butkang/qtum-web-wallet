<template>
  <v-card>
    <v-card-title>
      <span class="headline">{{ $t("view.title") }}</span>
    </v-card-title>
    <v-card-text>
      <v-layout v-for="(item, i) in infoLabel" :key="i">
        <v-flex xs3>
          <v-subheader>
            {{ $t("common.info." + item.label) }}
          </v-subheader>
        </v-flex>
        <v-flex xs7>
          <v-text-field v-model="info[item.name]" disabled></v-text-field>
        </v-flex>
        <v-flex xs2>
          <v-btn
            small
            class="mt-3"
            color="cyan"
            v-clipboard:copy="info[item.name]"
            v-clipboard:success="onCopySucc"
            v-clipboard:error="onCopyError"
            v-if="item.copy"
          >
            {{ $t("common.copy") }}
          </v-btn>
        </v-flex>
      </v-layout>
      <v-layout class="view-private" v-if="privKey !== null">
        <v-flex xs3>
          <v-subheader>
            {{ $t("common.info.priv_key") }}
          </v-subheader>
        </v-flex>
        <v-flex xs7>
          <v-text-field
            v-model="privKey"
            disabled
            :type="showPriv ? 'text' : 'password'"
          >
          </v-text-field>
        </v-flex>
        <div class="view-private-line__wrapper">
          <div class="view-private-line">
            <v-icon @click="showPriv = !showPriv">{{ showPriv ? 'visibility_off' : 'visibility' }}</v-icon>
          </div>
        </div>
        <v-flex xs2>
          <v-btn
            small
            class="mt-3"
            color="cyan"
            v-show="showPriv"
            v-clipboard:copy="privKey"
            v-clipboard:success="onCopySucc"
            v-clipboard:error="onCopyError"
          >
            {{ $t("common.copy") }}
          </v-btn>
        </v-flex>
      </v-layout>
    </v-card-text>
  </v-card>
</template>

<script>
import NFTList from '@/components/NFT/NFTList.vue'
import webWallet from '@/libs/web-wallet'
import track from '@/libs/track'

export default {
  data() {
    return {
      infoLabel: [
        { label: 'address', name: 'address', copy: true },
        { label: 'balance', name: 'balance' },
        { label: 'unconfirmed_balance', name: 'unconfirmedBalance' }
      ],
      wallet: webWallet.getWallet(),
      showPriv: false
    }
  },
  components: {
    'nft-list': NFTList
  },
  props: ['view'],
  watch: {
    view: function () {
      this.wallet.setInfo()
    }
  },
  computed: {
    info: function () {
      return this.wallet.info
    },
    privKey: function () {
      return this.wallet.getPrivKey()
    }
  },
  mounted() {
    this.wallet.update()
  },
  methods: {
    onCopySucc: function () {
      track.trackAction('copy', 'view', 'privkey')
      this.$root.success('copy success')
    },
    onCopyError: function () {
      this.$root.error('copy fail')
    }
  }
}
</script>
<style lang="less" scoped>
.view-private {
  position: relative;
  &-line {
    display: flex;
    align-items: center;
    .theme--dark.v-icon {
      color: hsla(0,0%,100%,.7);
    }

    &__wrapper {
      position: absolute;
      right: 16%;
      top: 50%;
      transform: translateY(-50%);
    }
  }

}
</style>
