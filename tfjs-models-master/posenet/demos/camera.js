/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licnses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import dat from 'dat.gui';
import Stats from 'stats.js';
import * as posenet from '@tensorflow-models/posenet';
import request from 'request'

const uuidv1 = require('uuid/v1');

import {drawKeypoints, drawSkeleton} from './demo_util';
import {b64toBlob, base64toBuffer, bufferToBase64} from "./Util/ImageUtil";

const videoWidth = 600;
const videoHeight = 500;
const requestUrl = 'http://localhost:3000'
const stats = new Stats();


function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}

function isiOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
    return isAndroid() || isiOS();
}

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw 'Browser API navigator.mediaDevices.getUserMedia not available';
    }

    const video = document.getElementById('video');
    video.width = videoWidth;
    video.height = videoHeight;

    const mobile = isMobile();
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user',
            width: mobile ? undefined : videoWidth,
            height: mobile ? undefined : videoHeight
        }
    });
    video.srcObject = stream;

    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadVideo() {
    const video = await setupCamera();
    video.play();

    return video;
}

const guiState = {
    algorithm: 'multi-pose',
    input: {
        mobileNetArchitecture: isMobile() ? '0.50' : '1.01',
        outputStride: 16,
        imageScaleFactor: 0.5,
    },
    singlePoseDetection: {
        minPoseConfidence: 0.1,
        minPartConfidence: 0.5,
    },
    multiPoseDetection: {
        maxPoseDetections: 2,
        minPoseConfidence: 0.1,
        minPartConfidence: 0.3,
        nmsRadius: 20.0,
    },
    output: {
        showVideo: true,
        showSkeleton: true,
        showPoints: true,
    },
    accurate: {
        noseScore: 0.99,
        leftEyeScore: 0.99,
        rightEyeScore: 0.99,
        leftEarScore: 0.68,
        rightEarScore: 0.68,
    },
    net: null,
};

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras, net) {
    guiState.net = net;

    if (cameras.length > 0) {
        guiState.camera = cameras[0].deviceId;
    }

    const cameraOptions = cameras.reduce((result, {label, deviceId}) => {
        result[label] = deviceId;
        return result;
    }, {});

    const gui = new dat.GUI({width: 300});

    // The single-pose algorithm is faster and simpler but requires only one person to be
    // in the frame or results will be innaccurate. Multi-pose works for more than 1 person
    const algorithmController = gui.add(
        guiState, 'algorithm', ['single-pose', 'multi-pose']);

    // The input parameters have the most effect on accuracy and speed of the network
    let input = gui.addFolder('Input');
    // Architecture: there are a few PoseNet models varying in size and accuracy. 1.01
    // is the largest, but will be the slowest. 0.50 is the fastest, but least accurate.
    const architectureController =
        input.add(guiState.input, 'mobileNetArchitecture', ['1.01', '1.00', '0.75', '0.50']);
    // Output stride:  Internally, this parameter affects the height and width of the layers
    // in the neural network. The lower the value of the output stride the higher the accuracy
    // but slower the speed, the higher the value the faster the speed but lower the accuracy.
    input.add(guiState.input, 'outputStride', [8, 16, 32]);
    // Image scale factor: What to scale the image by before feeding it through the network.
    input.add(guiState.input, 'imageScaleFactor').min(0.2).max(1.0);
    input.open();

    // Pose confidence: the overall confidence in the estimation of a person's
    // pose (i.e. a person detected in a frame)
    // Min part confidence: the confidence that a particular estimated keypoint
    // position is accurate (i.e. the elbow's position)
    let single = gui.addFolder('Single Pose Detection');
    single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0);
    single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0);
    single.open();

    let multi = gui.addFolder('Multi Pose Detection');
    multi.add(
        guiState.multiPoseDetection, 'maxPoseDetections').min(1).max(20).step(1);
    multi.add(guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0);
    multi.add(guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0);
    // nms Radius: controls the minimum distance between poses that are returned
    // defaults to 20, which is probably fine for most use cases
    multi.add(guiState.multiPoseDetection, 'nmsRadius').min(0.0).max(40.0);

    let output = gui.addFolder('Output');
    output.add(guiState.output, 'showVideo');
    output.add(guiState.output, 'showSkeleton');
    output.add(guiState.output, 'showPoints');
    output.open();

    let accurate = gui.addFolder('Capture Precision');
    accurate.add(guiState.accurate, 'noseScore', 0.0, 1.0);
    accurate.add(guiState.accurate, 'leftEyeScore', 0.0, 1.0);
    accurate.add(guiState.accurate, 'rightEyeScore', 0.0, 1.0);
    accurate.add(guiState.accurate, 'leftEarScore', 0.0, 1.0);
    accurate.add(guiState.accurate, 'rightEarScore', 0.0, 1.0);


    architectureController.onChange(function (architecture) {
        guiState.changeToArchitecture = architecture;
    });

    algorithmController.onChange(function (value) {
        switch (guiState.algorithm) {
            case 'single-pose':
                multi.close();
                single.open();
                break;
            case 'multi-pose':
                single.close();
                multi.open();
                break;
        }
    });
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
}


/**
 * Feeds an image to posenet to estimate poses - this is where the magic happens.
 * This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
    const canvas = document.getElementById('output');
    const facecanvas = document.getElementById('faceoutput');
    const ctx = canvas.getContext('2d');
    const faceCtx = facecanvas.getContext('2d');
    const faceSize = videoWidth / 2;
    const flipHorizontal = true; // since images are being fed from a webcam

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    facecanvas.width = faceSize
    facecanvas.height = faceSize

    async function poseDetectionFrame() {
        if (guiState.changeToArchitecture) {
            // Important to purge variables and free up GPU memory
            guiState.net.dispose();

            // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01 version
            guiState.net = await posenet.load(Number(guiState.changeToArchitecture));

            guiState.changeToArchitecture = null;
        }

        // Begin monitoring code for frames per second
        stats.begin();

        // Scale an image down to a certain factor. Too large of an image will slow down
        // the GPU
        const imageScaleFactor = guiState.input.imageScaleFactor;
        const outputStride = Number(guiState.input.outputStride);

        let poses = [];
        let minPoseConfidence;
        let minPartConfidence;
        switch (guiState.algorithm) {
            case 'single-pose':
                const pose = await guiState.net.estimateSinglePose(video, imageScaleFactor, flipHorizontal, outputStride);
                poses.push(pose);

                minPoseConfidence = Number(
                    guiState.singlePoseDetection.minPoseConfidence);
                minPartConfidence = Number(
                    guiState.singlePoseDetection.minPartConfidence);
                break;
            case 'multi-pose':
                poses = await guiState.net.estimateMultiplePoses(video, imageScaleFactor, flipHorizontal, outputStride,
                    guiState.multiPoseDetection.maxPoseDetections,
                    guiState.multiPoseDetection.minPartConfidence,
                    guiState.multiPoseDetection.nmsRadius);


                minPoseConfidence = Number(guiState.multiPoseDetection.minPoseConfidence);
                minPartConfidence = Number(guiState.multiPoseDetection.minPartConfidence);
                break;
        }

        ctx.clearRect(0, 0, videoWidth, videoHeight);
        if (guiState.output.showVideo) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-videoWidth, 0);
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            ctx.restore();
        }

        // var strDataURI = canvas.toDataURL('image/png');

        // For each pose (i.e. person) detected in an image, loop through the poses
        // and draw the resulting skeleton and keypoints if over certain confidence
        // scores
        poses.forEach(({score, keypoints}, index) => {
            if (score >= minPoseConfidence) {
                if (guiState.output.showPoints) {
                    drawKeypoints(keypoints, minPartConfidence, ctx);
                }
                if (guiState.output.showSkeleton) {
                    drawSkeleton(keypoints, minPartConfidence, ctx);
                }

                faceCtx.clearRect(0, 0, faceSize, faceSize);
                //以鼻子为中心点，获取脸部图像。
                faceCtx.save();
                faceCtx.scale(-1, 1);
                faceCtx.translate(-faceSize, 0);
                faceCtx.drawImage(video, videoWidth - keypoints[0].position.x + faceSize / 2, keypoints[0].position.y - faceSize / 2 - 30, -faceSize, faceSize, 0, 0, faceSize, faceSize);
                faceCtx.restore();

                let strDataURIT = facecanvas.toDataURL('image/png');
                let detectResult = ""
                let imageId = ""
                let info = ""
                let addPicResult = ""
                let searchResult = ""
                let savePicResult = ""
                if (
                    keypoints[0].score > guiState.accurate.noseScore &&
                    keypoints[1].score > guiState.accurate.leftEyeScore &&
                    keypoints[2].score > guiState.accurate.rightEyeScore &&
                    keypoints[3].score > guiState.accurate.leftEarScore &&
                    keypoints[4].score > guiState.accurate.rightEarScore
                ) {

                    //保存人脸图片
                    request.post({
                        url: requestUrl + '/upload',
                        form: {"image": strDataURIT, "insertId": uuidv1()}
                    }, function (err, response, body) {
                        savePicResult = JSON.parse(body)
                        if (savePicResult.result.picSrc !== undefined && savePicResult.result.picSrc !== null) {

                            //添加人脸图片到数据库
                            request.post({
                                url: requestUrl + '/facePic/addPic',
                                form: {"src": savePicResult.result.picSrc}
                            }, function (err, response, body) {
                                addPicResult = JSON.parse(body)
                                if (addPicResult.insertId !== undefined) {
                                    imageId = addPicResult.insertId

                                    //将人脸图片进行识别，返回识别信息
                                    request.post({
                                        url: requestUrl + '/faceDetect',
                                        form: {"base64": strDataURIT}
                                    }, function (err, response, body) {

                                        detectResult = JSON.parse(body)
                                        if ((detectResult.error_msg).indexOf("SUCCESS") !== -1) {
                                            info = JSON.stringify(detectResult)

                                            //人脸识别结果正常，则将图片进行人脸库对比，若对比得分最高也低于60分，则判断为新用户
                                            request.post({
                                                url: requestUrl + '/faceSearch',
                                                form: {"base64": strDataURIT}
                                            }, function (err, response, body) {
                                                searchResult = JSON.parse(body)
                                                if ((searchResult.error_msg).indexOf("SUCCESS") !== -1) {
                                                    if (searchResult.result.user_list[0].score < 80) {

                                                        //人脸对比结果为新用户，先放入人脸库
                                                        request.post({
                                                            url: requestUrl + '/faceGroupAddUser',
                                                            form: {"base64": strDataURIT, "insertId": imageId}
                                                        }, function (err, response, groupMes) {

                                                            console.log('face group add user success' + info)
                                                            if (groupMes !== undefined) {
                                                                let groupMesJson = JSON.parse(groupMes)
                                                                if ((groupMesJson.error_msg).indexOf("SUCCESS") !== -1) {

                                                                    //成功放入人脸库后，在本地数据库进行存储
                                                                    request.post({
                                                                        url: requestUrl + '/oldUser/addNewUser',
                                                                        form: {
                                                                            "faceId": imageId,
                                                                            "uid": groupMesJson.uid,
                                                                            "faceMes": info
                                                                        }
                                                                    }, function (err, response, body) {
                                                                        console.log('add old user success')

                                                                    })
                                                                }
                                                            }
                                                        })


                                                    } else if (searchResult.result.user_list[0].score > 96) {

                                                        //若判断统一人脸分值超过90分，则讲用户定义为老用户
                                                        request.get({
                                                            url: requestUrl + '/oldUser/setOldUser/' + searchResult.result.user_list[0].user_id,
                                                        }, function (err, response, body) {

                                                            // console.log('set old user success')
                                                        })
                                                    } else {

                                                        //若既不是新用户，也不是老面孔，则删除该图片
                                                        request.get({
                                                            url: requestUrl + '/facePic/del/' + addPicResult.insertId
                                                        }, function (err, response, body) {

                                                        })
                                                    }

                                                } else {

                                                    //若人脸库没有结果，直接添加到人脸库
                                                    request.post({
                                                        url: requestUrl + '/faceGroupAddUser',
                                                        form: {"base64": strDataURIT, "insertId": imageId}
                                                    }, function (err, response, groupMes) {
                                                        if (groupMes !== null && groupMes !== undefined) {
                                                            let groupMesJson = JSON.parse(groupMes)
                                                            if ((groupMesJson.error_msg).indexOf("SUCCESS") !== -1) {

                                                                //成功放入人脸库后，在本地数据库进行存储
                                                                request.post({
                                                                    url: requestUrl + '/oldUser/addNewUser',
                                                                    form: {
                                                                        "faceId": imageId,
                                                                        "uid": groupMesJson.uid,
                                                                        "faceMes": info
                                                                    }
                                                                }, function (err, response, body) {


                                                                })
                                                            } else {

                                                                //失败操作则把人脸照片删除
                                                                request.get({
                                                                    url: requestUrl + '/facePic/del/' + addPicResult.insertId
                                                                }, function (err, response, body) {

                                                                })
                                                            }
                                                        }
                                                    })
                                                }
                                            })

                                        } else {
                                            request.get({
                                                url: requestUrl + '/facePic/del/' + addPicResult.insertId
                                            }, function (err, response, body) {

                                            })
                                        }

                                    })
                                }
                            })
                        }
                    });
                    let faceImg = document.getElementById('face');
                    faceImg.src = strDataURIT
                }


                //请尽量保持直视人脸识别系统，举起左手或右手， 系统对您进行更精准分析。

                if (keypoints[9].position.y < keypoints[0].position.y || keypoints[10].position.y < keypoints[0].position.y) {

                    let faceImg = document.getElementById('face');
                    let faceT = document.getElementById('faceT');
                    switch (index) {
                        case 0:
                            faceImg.src = strDataURIT
                            break
                        case 1:
                            faceT.src = strDataURIT
                            break
                    }


                }

            }
        });

        // End monitoring code for frames per second
        stats.end();

        requestAnimationFrame(poseDetectionFrame);
    }

    poseDetectionFrame();
}


/**
 * Kicks off the demo by loading the posenet model, finding and loading available
 * camera devices, and setting off the detectPoseInRealTime function.
 */
export async function bindPage() {
    // Load the PoseNet model weights for version 1.01
    const net = await posenet.load();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('main').style.display = 'block';

    let video;

    try {
        video = await loadVideo();
    } catch (e) {
        let info = document.getElementById('info');
        info.textContent = "this browser does not support video capture, or this device does not have a camera";
        info.style.display = 'block';
        throw e;
    }

    setupGui([], net);
    setupFPS();
    detectPoseInRealTime(video, net);

}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;
bindPage(); // kick off the demo
