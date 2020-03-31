import wepy from 'wepy'
import { SERVER_URL } from '../../utils/config'

const minScale = 1, maxScale = 2
/**
 * 创建画布
 * @param {*} self 
 */
export function loadImgOnCanvas(self,src){
  src = src||self.tempImageSrc
  wepy.getImageInfo({
    src: src,
    success: function (res) {
      self.oldScale = 1
      self.initRatio = res.height / self.imgViewHeight  //转换为了px 图片原始大小/显示大小
      if (self.initRatio < res.width / (750 * self.deviceRatio)) {
        self.initRatio = res.width / (750 * self.deviceRatio)
      }
      //图片显示大小
      // const scaleWidth = (res.width / self.initRatio)
      // const scaleHeight = (res.height / self.initRatio)
      
      // self.initScaleWidth = self.scaleWidth
      // self.initScaleHeight = self.scaleHeight
      // self.canvasStartX = -self.scaleWidth / 2;
      // self.canvasStartY = -self.scaleHeight / 2;
      
      self.ctx = wepy.createCanvasContext('myCanvas')
      // self.ctx.translate((750 * self.deviceRatio) / 2, self.imgViewHeight / 2) //原点移至中心，保证图片居中显示
      self.ctx.drawImage(src, self.startX-self.imgLeft, self.startY-self.imgTop, self.scaleWidth, self.scaleHeight)
      self.ctx.draw()
    },
    fail: function(error){
      console.log('loadImgOnCanvas error',error)
    }
  })
}
/**
 * 加载图片
 * @param {*} self 
 */
export function loadImgOnImage(self){
  wepy.getImageInfo({
    src: self.tempImageSrc,
    success: function (res) {
      self.oldScale = 1
      self.initRatio = res.height / self.imgViewHeight  //转换为了px 图片原始大小/显示大小
      if (self.initRatio < res.width / (750 * self.deviceRatio)) {
        self.initRatio = res.width / (750 * self.deviceRatio)
      }
      //图片显示大小
      self.scaleWidth = (res.width / self.initRatio)
      self.scaleHeight = (res.height / self.initRatio)

      self.initScaleWidth = self.scaleWidth
      self.initScaleHeight = self.scaleHeight
      self.startX = 750 * self.deviceRatio / 2 - self.scaleWidth / 2;
      self.startY = self.imgViewHeight / 2 - self.scaleHeight / 2;

      self.imgWidth = self.scaleWidth
      self.imgHeight = self.scaleHeight
      self.imgTop = self.startY
      self.imgLeft = self.startX
      self.$apply()
      wepy.hideLoading();
    },
    fail: function(error){
      setTimeout(() => {
        wepy.showToast({
          title: '图片加载失败',
          icon: 'none'
        })
      }, 0);
      wepy.hideLoading();
      console.log(`loadImgOnImage error：${self.tempImageSrc}`,error,self)
    }
  })
}
/**
 * 选择图片
 * @param {*} self 
 */
export function chooseImage(self){
  wepy.chooseImage({
    count: 1,
    sizeType: ['compressed'], // 可以指定是原图还是压缩图，默认二者都有
    sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
    success: function (res) {
      self.imageNotChoosed = false
      self.tempImageSrc = res.tempFilePaths[0]
      loadImgOnImage(self)
    },
    fail: function (res) {
      if(!self.tempImageSrc){
        self.imageNotChoosed = true
        self.$apply()
      }
    }
  })
}

function throttle(fn, miniTimeCell) {
  var timer = null,
    previous = null;
  return function () {
    var now = +new Date(),
      context = this,
      args = arguments;
    if (!previous) previous = now;
    var remaining = now - previous;
    if (miniTimeCell && remaining >= miniTimeCell) {
      fn.apply(context, args);
      previous = now;
    }
  }
}

function drawOnTouchMove(self, e) {
  let [touch0, touch1] = e.touches
  let xMove, yMove, newDistance, xDistance, yDistance
  let isAllowMove = false  //判断是否可以允许移动 设定一定范围区域内允许移动 超过范围不允许移动
  if (e.timeStamp - self.timeOneFinger < 100) {//touch时长过短，忽略
    return
  }

  // 单指手势时触发
  if (e.touches.length === 1) {
    //计算单指移动的距离
    xMove = touch0.clientX - self.touchX
    yMove = touch0.clientY - self.touchY

    isAllowMove = ( self.startY + yMove < self.imgViewHeight - self.scaleHeight ) && ( Math.abs(self.startX + xMove) < 750 * self.deviceRatio / 2)
    console.log(self.startX + xMove,self.startY + yMove)
    if(isAllowMove){
      //转换移动距离到正确的坐标系下
      self.imgLeft = self.startX + xMove
      self.imgTop = self.startY + yMove
    }
  }
  // 两指手势触发
  if (e.touches.length >= 2) {
    // self.timeMoveTwo = e.timeStamp
    // 计算二指最新距离
    xDistance = touch1.clientX - touch0.clientX
    yDistance = touch1.clientY - touch0.clientY
    newDistance = Math.sqrt(xDistance * xDistance + yDistance * yDistance)

    //  使用0.005的缩放倍数具有良好的缩放体验
    self.newScale = self.oldScale + 0.005 * (newDistance - self.oldDistance)

    //  设定缩放范围
    self.newScale <= minScale && (self.newScale = minScale)
    self.newScale >= maxScale && (self.newScale = maxScale)

    self.scaleWidth = self.newScale * self.initScaleWidth
    self.scaleHeight = self.newScale * self.initScaleHeight

    self.imgLeft = self.deviceRatio * 750 / 2 - self.newScale * self.initLeft
    self.imgTop = self.imgViewHeight / 2 - self.newScale * self.initTop
    self.imgWidth = self.scaleWidth
    self.imgHeight = self.scaleHeight
  }
}

export function saveImgUseTempCanvas(self, delay, fn){
  setTimeout(() => {
    wepy.canvasToTempFilePath({
      x: 0,
      y: 0,
      width: self.tempCanvasWidth,
      height: self.tempCanvasHeight,
      destWidth: self.tempCanvasWidth,
      destHeight: self.tempCanvasHeight,
      fileType: 'png',
      quality: 1,
      canvasId: 'tempCanvas',
      success: function (res) {
        wepy.hideLoading();
        self.tempImageSrc = res.tempFilePath
        self.$apply()
        if(fn){
          //加载重新绘制的涂鸦图片
          fn(self) 
        }
      },
      fail: function(){
        wepy.hideLoading()
      }
    })
  }, 100);
}

export function saveDoodle(self, fn) {
  wepy.canvasToTempFilePath({
    x: 0,
    y: 0,
    width: self.scaleWidth,
    height: self.scaleHeight,
    fileType: 'png',
    quality: 1,
    canvasId: 'myCanvas',
    success: function (res) {
      self.tempImageSrc = res.tempFilePath
      loadImgOnImage(self) 
    },
    fail: function(e){
      console.log('保存失败',e)
      wepy.hideLoading()
    }
  })
}

export function upload(self) {
  if(!self.tempImageSrc) return
  wepy.showLoading({title: '上传中...', mask: true})
  wepy.uploadFile({
    url: SERVER_URL,
    filePath: self.tempImageSrc,
    name: 'file',
    formData:{
      id: 'upload'
    },
    success(res){
      wepy.navigateBack()
      setTimeout(() => {
        wepy.showToast({
          icon:'none',
          title:'图片上传成功',
          mask: true
        })
      }, 0);
    },
    fail(e){
      wepy.showToast({
        icon:'none',
        title:'图片上传失败！',
        mask: true
      })
    },
    complete(){
      wepy.hideLoading()
    }
  })
}

export const throttleFn = throttle(drawOnTouchMove, 100)