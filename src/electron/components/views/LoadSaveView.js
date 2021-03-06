import React from 'react'
import {
  connect
} from 'react-redux'
import {
  remote
} from 'electron'
import {
  loadSave as loadCemuSave
} from 'cemu-smm'

import SMMButton from '../../../client/components/buttons/SMMButton'
import ApiKeyArea from '../areas/ApiKeyArea'
import {
  addApiKey, deleteApiKey, addSave, loadSave, deleteSave
} from '../../actions'
import {
  setAccountData
} from '../../../client/actions'

const dialog = remote && remote.dialog

class LoadSaveView extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      loading: false,
      showApiKey: false
    }
    this.onAddSave = this.onAddSave.bind(this)
    this.onLoadSave = this.onLoadSave.bind(this)
    this.onDeleteSave = this.onDeleteSave.bind(this)
    this.showApiKey = this.showApiKey.bind(this)
    this.hideApiKey = this.hideApiKey.bind(this)
    this.onAddApiKey = this.onAddApiKey.bind(this)
    this.onDeleteApiKey = this.onDeleteApiKey.bind(this)
    this.getSaveName = this.getSaveName.bind(this)
  }
  componentWillReceiveProps (nextProps, nextContext) {
    if (nextProps.apiKey) {
      this.setState({
        apiKey: nextProps.apiKey
      })
    }
    if (nextProps.cemuSaveData !== this.props.cemuSaveData) {
      this.setState({
        loading: false
      })
    }
  }
  onAddSave () {
    dialog.showOpenDialog({properties: ['openDirectory']}, async cemuPaths => {
      if (cemuPaths) {
        const cemuPath = cemuPaths[0]
        try {
          const cemuSave = await loadCemuSave(cemuPath)
          this.setState({
            loading: true
          })
          cemuSave.reorderSync()
          await cemuSave.loadCourses()
          await cemuSave.exportThumbnail()
          await cemuSave.unlockAmiibos()
          this.props.dispatch(addSave(cemuPath, cemuSave))
        } catch (err) {
          console.log(err)
        }
      }
    })
  }
  onLoadSave () {
    (async (savePath, saveId) => {
      this.setState({
        loading: true
      })
      try {
        const cemuSave = await loadCemuSave(savePath)
        cemuSave.reorderSync()
        await cemuSave.loadCourses()
        await cemuSave.exportThumbnail()
        this.props.dispatch(loadSave(cemuSave, saveId))
      } catch (err) {
        console.log(err)
      }
    })(this.savePath, this.saveId)
  }
  onDeleteSave (saveId) {
    this.props.dispatch(deleteSave(saveId))
  }
  showApiKey () {
    this.setState({
      showApiKey: true
    })
  }
  hideApiKey () {
    this.setState({
      showApiKey: false
    })
  }
  onAddApiKey (account, apiKey) {
    this.props.dispatch(setAccountData(account))
    this.props.dispatch(addApiKey(apiKey))
    this.setState({
      showApiKey: false
    })
  }
  onDeleteApiKey () {
    this.props.dispatch(deleteApiKey())
  }
  getSaveName () {
    const split = this.savePath.split('\\')
    return `Load ${split[split.length - 4]} ${split[split.length - 1]}`
  }
  listCemuSaves (cemuSaves) {
    const self = this
    return Array.from((function * () {
      for (let i = 0; i < cemuSaves.size; i++) {
        self.savePath = cemuSaves.getIn([i, 'path'])
        self.saveId = i
        yield (
          <SMMButton key={i} text={self.getSaveName()} iconSrc='/img/profile.png' fontSize='13px' padding='3px' onDelete={self.onDeleteSave} onClick={self.onLoadSave} saveId={i} />
        )
      }
    })())
  }
  render () {
    const apiKey = this.props.apiKey
    const cemuSaves = this.props.cemuSaveData
    const styles = {
      global: {
        width: '100%',
        height: '100%'
      },
      center: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        flexDirection: 'column',
        height: '100%'
      },
      loading: {
        position: 'fixed',
        top: '0',
        right: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      text: {
        color: '#323245',
        textAlign: 'center'
      },
      showApiKey: {
        marginBottom: '40px'
      }
    }
    return (
      <div style={styles.global}>
        {
          <div style={styles.global}>
            <div style={styles.center}>
              {
                <div style={styles.showApiKey}>
                  <SMMButton text={`${apiKey ? 'Change' : 'Add'} API Key`} iconSrc='/img/api.png' fontSize='13px' padding='3px' onClick={this.showApiKey} />
                </div>
              }
              {
                cemuSaves.size > 0 &&
                this.listCemuSaves(cemuSaves)
              }
              <SMMButton text={cemuSaves.size === 0 ? 'Please select your Cemu SMM folder' : 'Load another Cemu SMM folder'} iconSrc='/img/profile.png' fontSize='13px' padding='3px' onClick={this.onAddSave} />
              {
                cemuSaves.size === 0 &&
                <div style={styles.text}>
                  Your SMM save folder is located at<br />'path\to\cemu\mlc01\emulatorSave\#saveID#'
                </div>
              }
            </div>
          </div>
        }
        {
          this.state.loading &&
            <div style={styles.loading}>
              <img src={'/img/load.gif'} />
            </div>
        }
        {
          this.state.showApiKey &&
          <ApiKeyArea apiKey={apiKey} onAddApiKey={this.onAddApiKey} onDeleteApiKey={this.onDeleteApiKey} onClose={this.hideApiKey} />
        }
      </div>
    )
  }
}
export default connect((state) => ({
  cemuSaveData: state.getIn(['electron', 'appSaveData', 'cemuSaveData']),
  apiKey: state.getIn(['electron', 'appSaveData', 'apiKey']),
  saveFileEditor: state.getIn(['electron', 'saveFileEditor'])
}))(LoadSaveView)
