import {TokenAddresses as contracts} from "./TokenAddresses";
import {TokenSymbols as QuoteToken} from "./TokenSymbols";

export const farmsConfig = [
    {
        pid: 0,
        risk: 5,
        lpSymbol: 'Kuy LPs (Kuy-LP)',
        lpAddresses: {
            97: '',
            96: '0x99aB8380aCBfB2CA86d7178D8A622be7BC54F4C8',
        },
        tokenSymbol: 'KUY',
        tokenAddresses: {
            97: '',
            96: '0x2009A60434dc8c8f772c9969d64868bDc2bF17B2',
        },
        quoteTokenSymbol: QuoteToken.KKUB,
        quoteTokenAdresses: contracts.KKUB,
    },
   
]