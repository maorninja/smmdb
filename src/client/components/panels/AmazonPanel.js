import React from 'react'
import {
  connect
} from 'react-redux'

import {
  ScreenSize
} from '../../reducers/mediaQuery'

const AWS_TAG = 'smmdb09-20'
const MAX_LENGTH_TITLE = 150
const MAX_LENGTH_DESCRIPTION = 400
const MAX_LENGTH_DESCRIPTION_SMALL = 200
const MAX_DESCRIPTION_VALUES = 6

class AmazonPanel extends React.PureComponent {
  constructor (props) {
    super(props)
    this.getImage = this.getImage.bind(this)
    this.onClick = this.onClick.bind(this)
  }
  componentWillMount () {
    const products = this.props.amazon.toJS()
    this.product = products[Math.floor(Math.random() * products.length)]
  }
  componentWillReceiveProps (nextProps, nextContext) {
    const products = nextProps.amazon.toJS()
    this.product = products[Math.floor(Math.random() * products.length)]
  }
  getImage (asin, country, width) {
    const domain = country === 'US' || country === 'CA' ? 'na' : 'eu'
    return `//ws-${domain}.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=${country}&ASIN=${asin}&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=_SL${width}_&tag=${AWS_TAG}`
  }
  onClick () {
    try {
      ga('send', 'event', {
        eventCategory: 'Outbound Link',
        eventAction: 'click',
        eventLabel: 'Amazon Associates',
        transport: 'beacon'
      })
    } catch (err) {}
  }
  render () {
    if (!this.product) return null
    const screenSize = this.props.screenSize
    let title = this.product.title || ''
    if (title.length > MAX_LENGTH_TITLE) {
      title = title.substr(0, MAX_LENGTH_TITLE)
      let index = Math.max(title.lastIndexOf(','), title.lastIndexOf('-'), title.lastIndexOf('|'))
      if (index === -1) index = title.lastIndexOf(' ')
      title = title.substr(0, index)
    }
    let description = ''
    const features = this.product.features
    if (features) {
      for (let i in features) {
        if (i >= MAX_DESCRIPTION_VALUES) break
        if (description.length + features[i].length >
          (screenSize === ScreenSize.SMALL ? MAX_LENGTH_DESCRIPTION_SMALL : MAX_LENGTH_DESCRIPTION)) break
        description += `${features[i]}\n`
      }
    }
    let price = this.product.price
    if (price && price.includes('EUR ')) {
      price = price.replace('EUR ', '') + '€'
    }
    let offerPrice = this.product.offerPrice
    if (offerPrice && offerPrice.includes('EUR ')) {
      offerPrice = offerPrice.replace('EUR ', '') + '€'
    }
    let isOffer = false
    if (price && offerPrice) {
      const priceVal = parseFloat(price.replace(/[^0-9.]/g, ''))
      const offerPriceVal = parseFloat(offerPrice.replace(/[^0-9.]/g, ''))
      isOffer = offerPriceVal < priceVal
    }
    const styles = {
      panel: {
        height: 'auto'
      },
      a: {
        textDecoration: 'none'
      },
      main: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        background: '#fff',
        borderRadius: '10px',
        boxShadow: '0px 0px 5px 0px rgba(0,0,0,0.75)'
      },
      img: {
        width: 'auto',
        height: 'auto',
        maxWidth: '200px',
        maxHeight: '120px',
        padding: '0 10px'
      },
      logo: {
        width: '60px',
        height: 'auto',
        zIndex: '1',
        alignSelf: 'flex-end'
      },
      text: {
        width: '0',
        minWidth: '200px',
        height: 'auto',
        flex: '1 0 0%',
        padding: '5px 10px',
        color: '#000',
        justifyContent: 'space-evenly',
        display: 'flex',
        flexDirection: 'column'
      },
      price: {
        color: '#bf0000',
        fontSize: screenSize === ScreenSize.SUPER_SMALL ? '16px' : '18px'
      },
      priceOffer: {
        textDecoration: 'line-through',
        color: '#444',
        fontSize: screenSize === ScreenSize.SUPER_SMALL ? '11px' : '13px'
      },
      title: {
        display: 'block',
        fontSize: screenSize === ScreenSize.SUPER_SMALL ? '15px' : '17px'
      },
      description: {
        display: 'block',
        fontSize: screenSize === ScreenSize.SUPER_SMALL ? '10px' : '12px',
        color: '#222',
        whiteSpace: 'pre-line',
        padding: '5px'
      }
    }
    return (
      <div style={styles.panel}>
        <a target='_blank' href={this.product.detailPageURL} style={styles.a} onClick={this.onClick}>
          <div style={styles.main}>
            <img style={styles.img} src={this.getImage(this.product.asin, this.product.country, 300)} />
            <div style={styles.text}>
              <div style={styles.title}>
                {
                  isOffer ? (
                    <div><span style={styles.price}>{ offerPrice }</span><span style={styles.priceOffer}>{ price }</span></div>
                  ) : (
                    <span style={styles.price}>{ price || offerPrice }</span>
                  )
                } { title }
              </div>
              {
                screenSize > ScreenSize.SUPER_SMALL &&
                <div style={styles.description}>
                  { description }
                </div>
              }
              <img style={styles.logo} src='/img/amazon.svg' />
            </div>
          </div>
        </a>
      </div>
    )
  }
}
export default connect(state => ({
  amazon: state.get('amazon'),
  screenSize: state.getIn(['mediaQuery', 'screenSize'])
}))(AmazonPanel)