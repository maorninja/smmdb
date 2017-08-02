import {
  ObjectID
} from 'mongodb'
import {
  decompress, deserialize, loadCourse
} from 'cemu-smm'
import {
  zip
} from 'cross-unzip'
import tmp from 'tmp'
import fileType from 'file-type'
import randomString from 'crypto-random-string'

import { resolve, join } from 'path'
import * as fs from 'fs'

import Account from './Account'
import Database from './Database'

export default class Course {
  static async getCourse (courseId) {
    const res = await Database.filterCourses({ _id: ObjectID(courseId) }).toArray()
    if (!res || res.length === 0) return null
    res[0].toJSON = Course.toJSON.bind(res[0])
    return res[0]
  }

  static toJSON (accountId) {
    let result = Object.assign({}, this)
    result.id = this._id
    /* result.completed = course[completed].length // TODO
    result.starred = course[starred].length
    result.downloads = course[downloads].length
    if (loggedIn && course.completedByUser(accountId)) {
      result.completedself = 1
    } else {
      result.completedself = 0
    }
    if (loggedIn && course.starredByUser(accountId)) {
      result.starredself = 1
    } else {
      result.starredself = 0
    } */
    result.uploader = Account.getAccount(result.owner).username
    delete result._id
    delete result.serialized
    delete result.courseData
    return result
  }

  static async getCompressed (courseDB) {
    const tmpDir = tmp.dirSync({
      unsafeCleanup: true
    })
    const zipDir = join(tmpDir.name, 'course000')
    fs.mkdirSync(zipDir)
    const course = await deserialize(fs.readFileSync(join(__dirname, `../static/coursedata/${courseDB._id}`)))
    await course.writeToSave(0, zipDir)
    const outPath = join(tmpDir.name, `${courseDB.title.replace(/[^a-z|A-Z|0-9| |\-|!]/g, '')}.zip`)
    try {
      const res = await new Promise((resolve, reject) => {
        zip(zipDir, outPath, err => {
          if (err) reject(err)
          resolve(outPath)
        })
      })
      setTimeout(() => {
        tmpDir.removeCallback()
      }, 20000)
      return res
    } catch (err) {
      tmpDir.removeCallback()
      return null
    }
  }

  static getObject (courseId) {
    return deserialize(fs.readFileSync(join(__dirname, `../static/coursedata/${courseId}`)))
  }

  static getSerialized (courseId) {
    return fs.readFileSync(join(__dirname, `../static/coursedata/${courseId}.gz`))
  }

  static async get3DS (courseId) {
    return (await deserialize(fs.readFileSync(join(__dirname, `../static/coursedata/${courseId}`)))).to3DS()
  }

  static async fromBuffer (buffer, account) {
    const tmpFile = resolve(__dirname, randomString(10))
    fs.writeFileSync(tmpFile, buffer)
    const type = fileType(buffer)
    const mime = type && type.mime
    const buf = new Uint8Array(buffer)
    const is3DS = () => {
      const header = [0x04, 0x30, 0x04, 0x00, 0x7D, 0x00, 0x00, 0x00, 0xDD, 0xBA, 0xFE, 0xCA, 0x3B, 0xA0, 0xB2, 0xB8, 0x6E, 0x55, 0x29, 0x8B, 0x00, 0xC0, 0x10, 0x00]
      for (let i = 0; i < header.length; i++) {
        if (header[i] !== buf[i + 4]) {
          return false
        }
      }
      return true
    }
    const createCourse = async (courseData) => {
      const course = Object.assign({}, courseData)
      course.owner = account._id
      course.nintendoid = null
      course.videoid = null
      course.difficulty = 1
      course.lastmodified = course.modified
      delete course.modified
      course.uploaded = Math.floor(new Date().getTime() / 1000)
      if (!course.maker) course.maker = account.username
      delete course.tiles
      delete course.tilesSub
      delete course.sounds
      delete course.soundsSub
      delete course.thumbnail
      delete course.thumbnailPreview
      await Database.addCourse(course)
      fs.writeFileSync(join(__dirname, `../static/courseimg/${course._id}.jpg`), courseData.thumbnailPreview)
      fs.writeFileSync(join(__dirname, `../static/courseimg/${course._id}_full.jpg`), courseData.thumbnail)
      fs.writeFileSync(join(__dirname, `../static/coursedata/${course._id}`), await courseData.serialize())
      fs.writeFileSync(join(__dirname, `../static/coursedata/${course._id}.gz`), await courseData.serializeGzipped())
      course.toJSON = Course.toJSON.bind(course)
      return course
    }
    try {
      if (mime === 'application/x-rar-compressed' || mime === 'application/zip' || mime === 'application/x-7z-compressed' || mime === 'application/x-tar') {
        try {
          const courseData = await decompress(tmpFile)
          if (courseData == null) {
            fs.unlinkSync(tmpFile)
            return null
          }
          const courses = []
          for (let i = 0; i < courseData.length; i++) {
            const course = await createCourse(courseData[i])
            courses.push(course)
          }
          fs.unlinkSync(tmpFile)
          return courses
        } catch (err) {
          fs.unlinkSync(tmpFile)
          return null
        }
      } else if (is3DS()) {
        const courseData = await loadCourse(tmpFile, 0, false)
        await courseData.loadThumbnail()
        const course = await createCourse(courseData)
        fs.unlinkSync(tmpFile)
        return [course]
      } else {
        return null
      }
    } catch (err) {
      console.log(err)
      fs.unlinkSync(tmpFile)
      return null
    }
  }

  static async reupload (course, buffer) {
    const tmpFile = resolve(__dirname, randomString(10))
    fs.writeFileSync(tmpFile, buffer)
    const type = fileType(buffer)
    const mime = type && type.mime
    const buf = new Uint8Array(buffer)
    const is3DS = () => {
      const header = [0x04, 0x30, 0x04, 0x00, 0x7D, 0x00, 0x00, 0x00, 0xDD, 0xBA, 0xFE, 0xCA, 0x3B, 0xA0, 0xB2, 0xB8, 0x6E, 0x55, 0x29, 0x8B, 0x00, 0xC0, 0x10, 0x00]
      for (let i = 0; i < header.length; i++) {
        if (header[i] !== buf[i + 4]) {
          return false
        }
      }
      return true
    }
    const doUpdate = async (course, courseData) => {
      if (!(await courseData.isThumbnailBroken())) {
        fs.writeFileSync(join(__dirname, `../static/courseimg/${course._id}.jpg`), courseData.thumbnailPreview)
        fs.writeFileSync(join(__dirname, `../static/courseimg/${course._id}_full.jpg`), courseData.thumbnail)
        const update = {
          vFull: course.vFull ? course.vFull + 1 : 1,
          vPrev: course.vPrev ? course.vPrev + 1 : 1
        }
        course.vFull = update.vFull
        course.vPrev = update.vPrev
        await Database.updateCourse(course._id, update)
      }
      await courseData.setTitle(course.title)
      await courseData.setMaker(course.maker)
      course.gameStyle = courseData.gameStyle
      course.courseTheme = courseData.courseTheme
      course.courseThemeSub = courseData.courseThemeSub
      course.time = courseData.time
      course.autoScroll = courseData.autoScroll
      course.autoScrollSub = courseData.autoScrollSub
      course.width = courseData.width
      course.widthSub = courseData.widthSub
      course.lastmodified = courseData.modified
      fs.writeFileSync(join(__dirname, `../static/coursedata/${course._id}`), await courseData.serialize())
      fs.writeFileSync(join(__dirname, `../static/coursedata/${course._id}.gz`), await courseData.serializeGzipped())
    }
    try {
      if (mime === 'application/x-rar-compressed' || mime === 'application/zip' || mime === 'application/x-7z-compressed' || mime === 'application/x-tar') {
        const courseData = await decompress(tmpFile)
        if (!courseData || courseData.length !== 1) return null
        await doUpdate(course, courseData[0])
        fs.unlinkSync(tmpFile)
        return this
      } else if (is3DS()) {
        const courseData = await loadCourse(tmpFile, 0, false)
        await courseData.loadThumbnail()
        await doUpdate(course, courseData)
        fs.unlinkSync(tmpFile)
        return this
      } else {
        return null
      }
    } catch (err) {
      console.log(err)
      fs.unlinkSync(tmpFile)
      return null
    }
  }

  static async update (courseDB, { title, maker, nintendoid, videoid, difficulty }) {
    const update = {}
    const course = await deserialize(fs.readFileSync(join(__dirname, `../static/coursedata/${courseDB._id}`)))
    if (title) {
      update.title = title
      courseDB.title = title
      await course.setTitle(title)
    }
    if (maker) {
      update.maker = maker
      courseDB.maker = maker
      await course.setMaker(maker)
    }
    if (nintendoid != null) {
      update.nintendoid = nintendoid
      courseDB.nintendoid = nintendoid
    }
    if (videoid != null) {
      update.videoid = videoid
      courseDB.videoid = videoid
    }
    if (difficulty != null) {
      update.difficulty = difficulty
      courseDB.difficulty = difficulty
    }
    update.lastmodified = Math.trunc((new Date()).getTime() / 1000)
    courseDB.lastmodified = update.lastmodified
    await course.setModified(update.lastmodified)
    fs.writeFileSync(join(__dirname, `../static/coursedata/${this._id}`), await course.serialize())
    fs.writeFileSync(join(__dirname, `../static/coursedata/${this._id}.gz`), await course.serializeGzipped())
    await Database.updateCourse(courseDB._id, update)
  }

  static async setThumbnail (course, buffer, isWide, doClip) {
    const deserialized = await deserialize(fs.readFileSync(join(__dirname, `../static/coursedata/${this._id}`)))
    const thumbnail = await deserialized.setThumbnail(buffer, isWide, doClip)
    course.courseData = deserialized
    fs.writeFileSync(join(__dirname, `../static/courseimg/${course._id}${isWide ? '_full' : ''}.jpg`), thumbnail)
    fs.writeFileSync(join(__dirname, `../static/coursedata/${course._id}`), await course.courseData.serialize())
    fs.writeFileSync(join(__dirname, `../static/coursedata/${course._id}.gz`), await course.courseData.serializeGzipped())
    let update
    if (isWide) {
      course.vFull = course.vFull ? course.vFull + 1 : 1
      update = {
        vFull: course.vFull
      }
    } else {
      course.vPrev = course.vPrev ? course.vPrev + 1 : 1
      update = {
        vPrev: course.vPrev
      }
    }
    await Database.updateCourse(course._id, update)
    return thumbnail
  }

  static async delete (courseId) {
    await Database.deleteCourse(courseId)
    fs.unlinkSync(join(__dirname, `../static/courseimg/${courseId}.jpg`))
    fs.unlinkSync(join(__dirname, `../static/courseimg/${courseId}_full.jpg`))
    fs.unlinkSync(join(__dirname, `../static/coursedata/${courseId}`))
    fs.unlinkSync(join(__dirname, `../static/coursedata/${courseId}.gz`))
  }

  static getCourseAmount () {
    return Database.getCoursesCount()
  }
}
