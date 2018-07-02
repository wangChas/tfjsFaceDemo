/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 50720
 Source Host           : localhost:3306
 Source Schema         : aidb

 Target Server Type    : MySQL
 Target Server Version : 50720
 File Encoding         : 65001

 Date: 02/07/2018 18:17:07
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for facepic
-- ----------------------------
DROP TABLE IF EXISTS `facepic`;
CREATE TABLE `facepic` (
  `faceId` bigint(20) NOT NULL AUTO_INCREMENT,
  `image` text NOT NULL,
  PRIMARY KEY (`faceId`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2960 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for history
-- ----------------------------
DROP TABLE IF EXISTS `history`;
CREATE TABLE `history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `uid` bigint(20) NOT NULL,
  `crdate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=582 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for newuser
-- ----------------------------
DROP TABLE IF EXISTS `newuser`;
CREATE TABLE `newuser` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `uid` bigint(20) NOT NULL,
  `photo` text NOT NULL,
  `info` varchar(1000) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=656 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for olduser
-- ----------------------------
DROP TABLE IF EXISTS `olduser`;
CREATE TABLE `olduser` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `uid` bigint(20) NOT NULL,
  `faceId` bigint(20) NOT NULL,
  `info` varchar(20000) NOT NULL,
  `isNew` bit(1) NOT NULL DEFAULT b'1',
  `crdate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uid_index` (`uid`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=444 DEFAULT CHARSET=utf8;

SET FOREIGN_KEY_CHECKS = 1;
