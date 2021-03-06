import React from 'react'
import {
  Link
} from 'react-router-dom'

export default class SubNavigationButton extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      hover: false
    }
    this.onMouseEnter = this.onMouseEnter.bind(this)
    this.onMouseLeave = this.onMouseLeave.bind(this)
  }
  onMouseEnter () {
    this.setState({
      hover: true
    })
  }
  onMouseLeave () {
    this.setState({
      hover: false
    })
  }
  render () {
    const hover = this.state.hover
    const styles = {
      button: {
        width: 'auto',
        height: '32px',
        minHeight: '32px',
        lineHeight: '32px',
        backgroundColor: hover ? '#ffd800' : 'rgba(255,229,0,0.7)',
        boxShadow: '0px 0px 5px 0px rgba(0,0,0,0.75)',
        cursor: 'pointer',
        overflow: 'hidden',
        marginLeft: '20px'
      },
      icon: {
        margin: '4px',
        width: '24px',
        height: '24px',
        float: 'left',
        padding: '4px'
      },
      img: {
        width: '100%',
        height: '100%'
      },
      text: {
        color: '#323245',
        float: 'left',
        width: 'auto',
        paddingRight: '5px'
      }
    }
    const content = (
      <div>
        <div style={styles.icon}>
          <img style={styles.img} src={this.props.iconSrc} />
        </div>
        <div style={styles.text}>
          { this.props.text }
        </div>
      </div>
    )
    return (
      <div style={styles.button} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onClick={this.props.onClick}>
        {
          this.props.blank ? (
            <a href={this.props.link} target='__blank'>
              { content }
            </a>
          ) : (
            <Link to={this.props.link}>
              { content }
            </Link>
          )
        }
      </div>
    )
  }
}
