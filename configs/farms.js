import {TokenAddresses as contracts} from "./TokenAddresses";
import {TokenSymbols as QuoteToken} from "./TokenSymbols";

export const farmsConfig = [
    {
        pid: 0,
        risk: 5,
        lpSymbol: 'Kuy LPs (Kuy-LP)',
        lpAddresses: {
            97: '',
            96: '0x414F20D35Ade4f8ead9eF26F2a982AFb6b4f3EE5',
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