var express = require('express');
var router = express.Router();

var db = require("./DBConfig");

/**
 * 查询列表页
 */
router.get("/",function(req,res,next){
    db.query("select * from newuser",function(err,rows){
        res.send(rows)
    });
});


module.exports = router;