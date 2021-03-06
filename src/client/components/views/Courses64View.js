import React from 'react'
import {
  connect
} from 'react-redux'
import {
  Route, withRouter
} from 'react-router-dom'
import got from 'got'

import { resolve } from 'url'
import { stringify } from 'querystring'

import {
  ScreenSize
} from '../../reducers/mediaQuery'
import {
  setCourses64, deleteCourse64, resetFilter, resetOrder
} from '../../actions'
import {
  domain
} from '../../../static'

import Course64Panel from '../panels/Course64Panel'
import AmazonPanel from '../panels/AmazonPanel'
import StatsPanel from '../panels/StatsPanel'
import SideBarArea from '../areas/SideBarArea'
import FilterArea from '../areas/FilterArea'

const LIMIT = 16

class Courses64View extends React.PureComponent {
  constructor (props) {
    super(props)
    this.queryString = stringify(props.filter.toJS())
    this.fetchCourses = this.fetchCourses.bind(this)
    this.renderCourses = this.renderCourses.bind(this)
    this.onCourseDelete = this.onCourseDelete.bind(this)
    this.handleScroll = this.handleScroll.bind(this)
  }
  componentWillMount () {
    this.props.dispatch(resetFilter())
    this.props.dispatch(resetOrder())
    if (!this.props.isServer) this.props.setFetchCourses(this.fetchCourses)
    this.fetchCourses()
  }
  componentWillReceiveProps (nextProps, nextContext) {
    if (nextProps.filter === this.props.filter && nextProps.order === this.props.order) return
    if (this.scroll) this.scroll.scrollTop = 0
    const order = nextProps.order.toJS()
    this.queryString = stringify(Object.assign({}, nextProps.filter.toJS(), {
      order: order.order,
      dir: order.dir ? 'asc' : 'desc'
    }))
    // this.scrollBar.scrollToTop(); // TODO
    this.fetchCourses()
  }
  async fetchCourses (shouldConcat = false, limit = LIMIT) {
    try {
      const apiKey = this.props.apiKey
      const courses = (await got(resolve(domain, `/api/getcourses64?limit=${limit}&start=${shouldConcat ? this.props.courses.size : 0}${this.queryString ? `&${this.queryString}` : ''}`), Object.assign({
        json: true,
        useElectronNet: false
      }, this.props.apiKey ? {
        headers: {
          'Authorization': `APIKEY ${this.props.apiKey}`
        }
      } : null))).body
      if (courses != null && apiKey === this.props.apiKey) {
        this.props.dispatch(setCourses64(courses, shouldConcat))
      }
    } catch (err) {
      if (err.response) {
        console.error(err.response.body)
      } else {
        console.error(err)
      }
    }
  }
  renderCourses () {
    const accountData = this.props.accountData
    const courses = this.props.courses
    const onCourseDelete = this.onCourseDelete
    return Array.from((function * () {
      let i = 0
      for (let course of courses) {
        if ((i - 3) % 9 === 0) {
          yield (
            <AmazonPanel is64 key={i} />
          )
        }
        yield (
          (accountData.get('id') && course.get('owner') === accountData.get('id')) || accountData.get('permissions') === 1 ? (
            <Course64Panel key={course.get('id')} canEdit course={course} apiKey={accountData.get('apikey')} id={i} onCourseDelete={onCourseDelete} />
          ) : (
            <Course64Panel key={course.get('id')} course={course} apiKey={accountData.get('apikey')} id={i} />
          )
        )
        i++
      }
    })())
  }
  onCourseDelete (courseId) {
    this.props.dispatch(deleteCourse64(courseId))
  }
  handleScroll (e) {
    this.props.shouldUpdate(e.target)
  }
  render () {
    const screenSize = this.props.screenSize
    const styles = {
      main: {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap'
      },
      content: {
        maxHeight: 'calc(100% - 34px)',
        overflowY: screenSize >= ScreenSize.MEDIUM ? 'auto' : '',
        zIndex: '10',
        flex: '1',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        alignItems: 'flex-start'
      }
    }
    return (
      <div style={styles.main}>
        <StatsPanel is64 />
        {
          screenSize >= ScreenSize.MEDIUM &&
          (
            <SideBarArea is64 />
          )
        }
        <div style={styles.content} id='scroll' onScroll={this.handleScroll} ref={scroll => { this.scroll = scroll }}>
          {
            this.renderCourses()
          }
        </div>
        <Route path='/courses64/filter' component={FilterArea} />
      </div>
    )
  }
}
export default withRouter(connect(state => ({
  screenSize: state.getIn(['mediaQuery', 'screenSize']),
  courses: state.getIn(['courseData', 'main64']),
  accountData: state.getIn(['userData', 'accountData']),
  filter: state.getIn(['filter', 'currentFilter']),
  order: state.get('order'),
  apiKey: state.getIn(['userData', 'accountData', 'apikey'])
}))(Courses64View))
