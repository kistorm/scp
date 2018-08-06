const schedule = require("node-schedule");
const path = require("path");
const fs = require("fs");
const Client = require('ssh2').Client;
const conf = {
    port: 22,
    host: 'xxxx',
    username: 'xx',
    password: 'xxx'
}
const srcDir = '/xxx/xx/xxx'; //srv dirctory
const targetDir = path.join(path.resolve(__dirname, "..", "/xxx"), "/"); //local 
const flist = [];
const fileSuxx = ".gz"; //match files
const conn = new Client();
conn.on('ready', function () {
    console.log('ssh connection ready');
    conn.sftp(function (err, sftp) {
        if (err) throw err;
        sftp.readdir(srcDir, function (err, list) {
            if (err) throw err;
            let donyTaskCount = 0;
            list.filter(file => {
                file.filename.indexOf(fileSuxx) >= 0 ? flist.push({
                    src: srcDir + '/' + file.filename,
                    fileName: file.filename
                }) : null;
            });
            if (flist.length == 0) {
                console.log("无数据写入任务!done");
                return conn.end();
            }
            flist.forEach(function (info) {
                let src = info.src;
                let target = path.join(targetDir, "/" + info.fileName);
                let sftpFileStream = sftp.createReadStream(src);
                let localFileStream = fs.createWriteStream(target);
                sftpFileStream.pipe(localFileStream);
                localFileStream.on("error", function (error) {
                    console.log(JSON.stringify(info), "写入错误！", error);
                })
                localFileStream.on("close", function () {
                    console.log("src:", src, "target:", target, "写入成功！");
                    donyTaskCount++;
                    sftp.unlink(info.src);
                })
            })

            schedule.scheduleJob('*    *    *    *    *    *', function (currenTime) {
                if (donyTaskCount >= flist.length) {
                    this.cancel();
                    return conn.end();
                } else {
                    console.log(currenTime, "当前写入本地文件数:", donyTaskCount, "当前任务处理进度", (donyTaskCount / flist.length).toFixed(2) * 100 + "%");
                }
            });
        });
    });
}).connect(conf);
