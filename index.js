const login = require("facebook-chat-api");
const fs = require("fs");
const googleTTS = require('google-tts-api');
const https = require('https');
const ytdl = require('ytdl-core');
const moment = require('moment-timezone');
const googleIt = require('google-it');

let randomMessageEnabled = {};

let userPoints = {};

let xoBoards = {};

fs.readFile("point.txt", "utf8", (err, data) => {
    if (err) {
        console.error("เกิดข้อผิดพลาดในการอ่านไฟล์ point.txt:", err);
        return;
    }

    const lines = data.split("\n").filter(line => line.trim() !== "");
    lines.forEach(line => {
        const [user, point] = line.split(",");
        userPoints[user] = parseInt(point) || 0;
    });

    fs.readFile("threadID.txt", "utf8", (err, data) => {
        if (err) {
            console.error("เกิดข้อผิดพลาดในการอ่านไฟล์ threadID:", err);
            return;
        }
        let allowedThreadIDs = data.split("\n").map(id => id.trim()).filter(id => id !== "");

        login({ appState: JSON.parse(fs.readFileSync(__dirname + "/appstate.json", "utf-8")) }, (err, api) => {
            if (err) return console.error(err);

            /*function getThaiDay(day) {
                switch (day) {
                    case 0:
                        return "วันอาทิตย์";
                    case 1:
                        return "วันจันทร์";
                    case 2:
                        return "วันอังคาร";
                    case 3:
                        return "วันพุธ";
                    case 4:
                        return "วันพฤหัสบดี";
                    case 5:
                        return "วันศุกร์";
                    case 6:
                        return "วันเสาร์";
                    default:
                        return "";
                }
            }
            function isFiveAMThaiTimes() {
                const thaiDateTime = moment.tz("Asia/Bangkok");
                const thaiTimes = thaiDateTime.format("HH:mm");
                const thaiDay = getThaiDay(thaiDateTime.day());
                const thaiDate = thaiDateTime.format("DD MMMM YYYY");
                return thaiTimes === "06:30" && thaiDay && thaiDate;
            }
            setInterval(() => {
                if (isFiveAMThaiTimes()) {
                    const thaiDateTime = moment.tz("Asia/Bangkok");
                    const thaiDay = getThaiDay(thaiDateTime.day());
                    const thaiDate = thaiDateTime.format("DD MMMM YYYY");
                    allowedThreadIDs.forEach(threadID => {
                        api.sendMessage(`สวัสดียามเช้า\n${thaiDay}ที่ ${thaiDate} ครับ`, threadID);
                    });
                }
            }, 60000);                                 

            function isFiveAMThaiTime() {
                const thaiTime = moment.tz("Asia/Bangkok").format("HH:mm");
                return thaiTime === "21:30";
            }
            setInterval(() => {
                if (isFiveAMThaiTime()) {
                    allowedThreadIDs.forEach(threadID => {
                        api.sendMessage("คืนนี้นอนหลับฝันดีนะครับ :>", threadID);
                    });
                }
            }, 60000);*/

            api.listenMqtt((err, message) => {
                if (err) return console.error(err);
                if (message && message.body) {
                    if (message && message.body && allowedThreadIDs.includes(message.threadID) && message.body.startsWith("/yt")) {
                        const videoUrl = message.body.slice(4).trim();
                        const options = {
                          quality: 'lowestaudio', // เลือกคุณภาพไฟล์เสียงที่สูงสุด
                          filter: 'audioonly', // กำหนดให้ดาวน์โหลดเฉพาะเสียงเท่านั้น
                        };
                        api.setMessageReaction("👍", message.messageID);
                        api.sendMessage("รอไฟล์เสียง 1-10 นาที", message.threadID, message.messageID);
                        const outputFile = 'mp3.mp3';
                        const output = fs.createWriteStream(outputFile);
                        ytdl(videoUrl, options)
                          .pipe(output)
                          .on('finish', () => {
                            api.sendMessage({ attachment: fs.createReadStream(outputFile) }, message.threadID, () => {
                              fs.unlinkSync(outputFile);
                            });
                          })
                          .on('error', (error) => {
                            console.error('เกิดข้อผิดพลาดในการดาวน์โหลดหรือแปลงเสียง:', error);
                          });
                    }
                    if (message.body == message.body) {
                        message.body = message.body.toLowerCase();
                        if (message.body.toLowerCase() == "id") {
                            api.sendMessage(message.senderID, message.threadID, message.messageID);
                            api.setMessageReaction("👍", message.messageID);
                        } else if (message.body.toLowerCase() == "threadid") {
                            api.sendMessage(message.threadID, message.threadID, message.messageID);
                            api.setMessageReaction("👍", message.messageID);
                        } else if (message.body.startsWith("addid") && message.senderID === "100033015680359") {
                            const userCommand = message.body.split(" ");
                            if (userCommand[0] === "addid" && userCommand.length > 1) {
                                const newText = userCommand.slice(1).join(" ").trim();
                                appendAndSaveTextToFileid(newText, api, message)
                                    .then(successMessage => {
                                        if (!message.sent) {
                                            allowedThreadIDs.push(newText);
                                            api.sendMessage(`สวัสดีครับผม\nผมเป็นบอทเฟสบุ๊คที่จะมาช่วยเหลือต่างๆครับ\nเริ่มต้นใช้งานผมด้วยคำสั่ง "บอท" ได้เลย`, newText)
                                            api.sendMessage(successMessage, message.threadID, message.messageID);
                                            api.setMessageReaction("👍", message.messageID);
                                        }
                                    })
                                    .catch(error => {
                                        if (!message.sent) {
                                            api.sendMessage("เกิดข้อผิดพลาดในการเพิ่มเธรด ID: " + error.message, message.threadID, message.messageID);
                                            api.setMessageReaction("👎", message.messageID);
                                        }
                                    });
                            }
                        } else if (message.body.startsWith("delid") && message.senderID === "100033015680359") {
                            if (message.senderID !== "100033015680359") {
                                api.sendMessage("คำสั่งนี้ใช้ได้แค่ Admin", message.threadID, message.messageID);
                                api.setMessageReaction("👎", message.messageID);
                            }
                            const userCommand = message.body.split(" ");
                            if (userCommand[0] === "delid" && userCommand.length > 1) {
                                const wordToDelete = userCommand.slice(1).join(" ").trim();
                                deleteWordFromFileid(wordToDelete, api, message)
                                    .then(successMessage => {
                                        if (!message.sent) {
                                            allowedThreadIDs = allowedThreadIDs.filter(id => id !== wordToDelete);
                                            api.sendMessage(`ลาก่อนนะครับ\nหวังว่าเราจะได้พบกันใหม่`, wordToDelete)
                                            api.sendMessage(successMessage, message.threadID, message.messageID);
                                            api.setMessageReaction("👍", message.messageID);
                                        }
                                    })
                                    .catch(error => {
                                        if (!message.sent) {
                                            api.sendMessage("เกิดข้อผิดพลาดในการลบเธรด ID: " + error.message, message.threadID, message.messageID);
                                            api.setMessageReaction("👎", message.messageID);
                                        }
                                    });
                            }
                        } else if (message.body.startsWith("addid") && message.senderID !== "100033015680359") {
                            api.sendMessage("คำสั่งนี้ใช้ได้แค่ 𝐀𝐝𝐦𝐢𝐧", message.threadID, message.messageID);
                            api.setMessageReaction("👎", message.messageID);
                        } else if (message.body.startsWith("delid") && message.senderID !== "100033015680359") {
                            api.sendMessage("คำสั่งนี้ใช้ได้แค่ 𝐀𝐝𝐦𝐢𝐧", message.threadID, message.messageID);
                            api.setMessageReaction("👎", message.messageID);
                        } else if (message.body.startsWith("addpoint") && message.senderID === "100033015680359") {
                            const userId = message.body.split(" ")[1];
                            const pointsToAdd = parseInt(message.body.split(" ")[2]);
                            if (!userId || isNaN(pointsToAdd)) {
                                api.sendMessage("กรุณาใช้รูปแบบคำสั่งที่ถูกต้อง: 𝐀𝐝𝐝𝐩𝐨𝐢𝐧𝐭 [𝐈𝐃] [จำนวน]", message.threadID, message.messageID);
                            } else {
                                if (!userPoints[userId]) {
                                    userPoints[userId] = pointsToAdd;
                                } else {
                                    userPoints[userId] += pointsToAdd;
                                }
                                saveUserPoints();
                                api.sendMessage(`ผู้ใช้ ${userId} ได้รับคะแนนเพิ่มเติม ${pointsToAdd} คะแนน รวมคะแนนทั้งหมด ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                            }
                        } else if (message.body.startsWith("delpoint") && message.senderID === "100033015680359") {
                            const userId = message.body.split(" ")[1];
                            const pointsToRemove = parseInt(message.body.split(" ")[2]);
                            if (!userId || isNaN(pointsToRemove)) {
                                api.sendMessage("กรุณาใช้รูปแบบคำสั่งที่ถูกต้อง: 𝐃𝐞𝐥𝐩𝐨𝐢𝐧𝐭 [𝐈𝐃] [จำนวน]", message.threadID, message.messageID);
                            } else {
                                if (!userPoints[userId]) {
                                    api.sendMessage(`ผู้ใช้ ${userId} ไม่มีคะแนนในระบบ`, message.threadID, message.messageID);
                                } else {
                                    userPoints[userId] -= pointsToRemove;
                                    if (userPoints[userId] < 0) {
                                        userPoints[userId] = 0;
                                    }
                                    saveUserPoints();
                                    api.sendMessage(`ผู้ใช้ ${userId} ถูกลบคะแนนไป ${pointsToRemove} คะแนน คงเหลือคะแนน ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                                }
                            }
                        } else if (message.body.startsWith("addpoint") || message.body.startsWith("removepoint")) {
                            api.sendMessage("คำสั่งนี้ใช้ได้แค่ 𝐀𝐝𝐦𝐢𝐧", message.threadID, message.messageID);
                        }
                    }
                }
                if (message && message.body && allowedThreadIDs.includes(message.threadID)) {
                    if (isLink(message.body)) {
                    } else {
                        message.body = message.body.toLowerCase();
                        if (message.body == "#กรุงเทพ") {
                            message.body = "#bangkok";
                        }
                        if (message.body.toLowerCase().startsWith("#")) {
                            const city = message.body.slice(1).trim();
                            getWeatherData(city)
                                .then(weatherData => {
                                    if (weatherData !== null) {
                                        const responseMessage = createResponseMessage(weatherData);
                                        api.sendMessage(responseMessage, message.threadID, message.messageID);
                                        api.setMessageReaction("👍", message.messageID);
                                    } else {
                                        api.sendMessage(`ไม่สามารถหาข้อมูลอุณหภูมิใน ${city} ได้ โปรดลองพิมชื่อจังหวัดให้ถูกหรือลองอีกครั้ง`, message.threadID, message.messageID);
                                        api.setMessageReaction("👎", message.messageID);
                                    }

                                });
                        } else if (message.body.startsWith("$")) {
                            const count = parseInt(message.body.slice(1).trim());
                            if (!isNaN(count) && count >= 1 && count <= 100) {
                                const randomNumbers = generateRandomNumbers(count);
                                const response = `เลขสุ่ม ${count} ตัว: ${randomNumbers.join('')}`;
                                api.sendMessage(response, message.threadID, message.messageID);
                                api.setMessageReaction("👍", message.messageID);
                            } else {
                                api.sendMessage("กรุณาใส่จำนวนเลขที่ต้องการสุ่มระหว่าง 1 ถึง 100", message.threadID, message.messageID);
                                api.setMessageReaction("👎", message.messageID);
                            }
                        } else if (message.body == "help" || message.body == "บอท" || message.body == "bot") {
                            const helpMessage = `💬 คำสั่งทั้งหมด 💬\n\n🌐 𝐇𝐞𝐥𝐩 | ดูคำสั่งทั้งหมด\n\n📛 𝐈𝐃 | ดู ID ตัวเอง\n\n🧵 𝐓𝐡𝐫𝐞𝐚𝐝𝐈𝐃 | ดู ID เธรด\n\n☁️ #[เมือง,ประเทศ,จังหวัด] | ดูข้อมูลสภาพอากาศ\n\n➗ ?[เลข][+,-,*,/][เลข] | บวกลบคูณหาร\n\n🔢 $[𝟏-𝟏𝟎𝟎] | สุ่มเลข 1-100 หลัก\n\n👷 𝐂𝐫𝐞𝐝𝐢𝐭 | ข้อมูลผู้สร้าง\n\n📩 ^[ข้อความ] | ส่งข้อมูลจำเป็นให้ Admin\n\n\n\n📢 คำสั่งแปลงเสียง 📢\n\n🔊 /𝐒 [ข้อความ] | เปลี่ยนข้อความเป็นเสียงสำเนียงไทย\n\n🎤 /𝐘𝐓 [ลิ้งค์ยูทูป] | ดึงเสียงจากยูทูปออกมา\n\n\n\n🤖 คำสั่งบอทเรื้อน 🤖\n\n🔴 𝐎𝐧𝐛𝐨𝐭 | เปิดบอทด่า\n\n🟢 𝐎𝐟𝐟𝐛𝐨𝐭 | ปิดบอทด่า\n\n➕ 𝐀𝐝𝐝 [คำด่า] | เพิ่มคำด่า\n\n➖ 𝐃𝐞𝐥 [คำด่า] | ลบคำด่า\n\n\n\n💰 คำสั่งคาสิโน 💰\n\n👤 !𝐔𝐬𝐞𝐫 | ลงทะเบียน\n\n👀 !𝐏 [𝐈𝐃] | ดูพ้อยของ ID นั้นๆ\n\n🎰 !𝐒 [𝟓-𝟓𝟎] | ปั่นสล็อตถูกรางวัลได้เงิน 4 เท่า\n\n🐓 !𝐂 [𝟓-𝟓𝟎] | ตีไก่ถูกรางวัลได้เงิน 2 เท่า\n\n🃏 !𝐁 [𝐏|𝐓|𝐁] [𝟓-𝟓𝟎] | ลงบาคาร่าชนะได้เงิน 2 เท่า ลงเสมอแล้วถูกได้เงิน 8 เท่า`;
                            api.sendMessage(helpMessage, message.threadID, message.messageID);
                            api.setMessageReaction("👍", message.messageID);
                        } else if (message.body == "บอทดี" || message.body == "บอทเก่ง" || message.body == "บอทเฟี้ยว" || message.body == "บอทน่ารัก" || message.body == "good bot") {
                            api.sendMessage("ไม่ต้องชมๆเขินเป็นนะ", message.threadID, message.messageID);
                            api.setMessageReaction("😍", message.messageID);
                        } else if (message.body.toLowerCase() == "id" || message.body.toLowerCase() == "threadid" || message.body.toLowerCase() == "addid" || message.body.toLowerCase() == "delid" || message.body.toLowerCase() == "delpoint" || message.body.toLowerCase() == "addpoint") {

                        } else if (message.body.startsWith("add")) {
                            const userCommand = message.body.split(" ");
                            if (userCommand[0] === "add" && userCommand.length > 1) {
                                const newText = userCommand.slice(1).join(" ").trim();
                                appendAndSaveTextToFile(newText, api, message)
                                    .then(successMessage => {
                                        if (!message.sent) {
                                            api.sendMessage(successMessage, message.threadID, message.messageID);
                                            api.setMessageReaction("👍", message.messageID);
                                        }
                                    })
                                    .catch(error => {
                                        if (!message.sent) {
                                            api.sendMessage("เกิดข้อผิดพลาดในการเพิ่มข้อความ: " + error.message, message.threadID, message.messageID);
                                            api.setMessageReaction("👎", message.messageID);
                                        }
                                    });
                            }
                        } else if (message.body.startsWith("del")) {
                            const userCommand = message.body.split(" ");
                            if (userCommand[0] === "del" && userCommand.length > 1) {
                                const wordToDelete = userCommand.slice(1).join(" ").trim();
                                deleteWordFromFile(wordToDelete, api, message)
                                    .then(successMessage => {
                                        if (!message.sent) {
                                            api.sendMessage(successMessage, message.threadID, message.messageID);
                                            api.setMessageReaction("👍", message.messageID);
                                        }
                                    })
                                    .catch(error => {
                                        if (!message.sent) {
                                            api.sendMessage("เกิดข้อผิดพลาดในการลบคำ: " + error.message, message.threadID, message.messageID);
                                            api.setMessageReaction("👎", message.messageID);
                                        }
                                    });
                            }
                        } else if (message.body == "onbot") {
                            randomMessageEnabled[message.threadID] = true;
                            api.sendMessage("🟢 เปิดบอทด่าแล้ว", message.threadID, message.messageID);
                            api.setMessageReaction("👍", message.messageID);
                        } else if (message.body == "offbot") {
                            randomMessageEnabled[message.threadID] = false;
                            api.sendMessage("🔴 ปิดบอทด่าแล้ว", message.threadID, message.messageID);
                            api.setMessageReaction("👍", message.messageID);
                        } else if (message.body.startsWith("?")) {
                            const regex = /^\?(\d+)([+\-*\/])(\d+)/;
                            const match = message.body.match(regex);
                            if (match) {
                                const operator = match[2];
                                const numbers = [parseInt(match[1]), parseInt(match[3])];
                                const result = calculate(numbers[0], numbers[1], operator);
                                api.sendMessage(`${result}`, message.threadID, message.messageID);
                                api.setMessageReaction("👍", message.messageID);
                            } else {
                                api.sendMessage("รูปแบบข้อความไม่ถูกต้อง", message.threadID, message.messageID);
                                api.setMessageReaction("👎", message.messageID);
                            }
                        } else if (message.body.startsWith("/s")) {
                            const textToSpeak = message.body.slice(3).trim();
                            if (textToSpeak.length > 200) {
                                api.sendMessage("ข้อความมากสุด 200 อักษร ตอนนี้คุณพิมไปแล้ว " + textToSpeak.length + " อักษร", message.threadID, message.messageID);
                                api.setMessageReaction("👎", message.messageID);
                            } else {
                                api.sendMessage("รอไฟล์เสียงสักครู่", message.threadID, message.messageID);
                                textToSpeech0(textToSpeak, api, message.threadID, message.messageID);
                                api.setMessageReaction("👍", message.messageID);
                            }
                        } else if (message.body.startsWith("!s")) {
                            const userId = message.senderID;
                            const fileData = fs.readFileSync("point.txt", "utf8");
                            const lines = fileData.split("\n");
                            const userExists = lines.some(line => line.startsWith(`${userId},`));
                        
                            if (!userExists) {
                                api.sendMessage("คุณยังไม่ได้รับการเพิ่มลงในระบบคะแนน กรุณาพิมพ์ '!𝐔𝐬𝐞𝐫' เพื่อเพิ่มตัวเองลงในระบบก่อน", message.threadID, message.messageID);
                                api.setMessageReaction("👎", message.messageID);
                            } else {
                                const betAmount = parseInt(message.body.split(" ")[1]);
                                if (betAmount < 5 || betAmount > 50 || isNaN(betAmount)) {
                                    api.sendMessage("กรุณาระบุจำนวนคะแนนที่ต้องการเดิมพันระหว่าง 5 ถึง 50 คะแนน", message.threadID, message.messageID);
                                    api.setMessageReaction("👎", message.messageID);
                                } else if (userPoints[userId] < betAmount) {
                                    api.sendMessage(`คุณมีคะแนนไม่พอ คุณมีคะแนนอยู่ที่ ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                                    api.setMessageReaction("👎", message.messageID);
                                } else {
                                    api.setMessageReaction("👍", message.messageID);
                                    var zyren = ["🍇", "🍉", "🍎", "🍒", "🍓"];
                                    emojiresult1 = zyren[Math.floor(Math.random() * zyren.length)];
                                    emojiresult2 = zyren[Math.floor(Math.random() * zyren.length)];
                                    emojiresult3 = zyren[Math.floor(Math.random() * zyren.length)];
                                    emojiresult4 = zyren[Math.floor(Math.random() * zyren.length)];
                                    randomwin = Math.floor(Math.random() * 10);
                                    if (randomwin > 8) {
                                        api.sendMessage("ผลเครื่องสล็อตแมชชีน :\n | " + emojiresult1 + " | " + emojiresult1 + " | " + emojiresult1 + " | " + emojiresult1 + " |", message.threadID);
                                        userPoints[userId] += betAmount * 3;
                                        saveUserPoints();
                                        api.sendMessage(`สุดยอดไปเลยคุณชนะ!\nคุณได้รับคะแนนเพิ่ม ${betAmount * 3} คะแนน รวมเป็น ${userPoints[userId]} คะแนนแล้ว`, message.threadID);
                                    } else if (emojiresult1 == emojiresult2 && emojiresult2 == emojiresult3 && emojiresult3 == emojiresult4) {
                                        api.sendMessage("ผลเครื่องสล็อตแมชชีน :\n | " + emojiresult1 + " | " + emojiresult1 + " | " + emojiresult1 + " | " + emojiresult1 + " |", message.threadID);
                                        userPoints[userId] += betAmount * 3;
                                        saveUserPoints();
                                        api.sendMessage(`สุดยอดไปเลยคุณชนะ!\nคุณได้รับคะแนนเพิ่ม ${betAmount * 3} คะแนน รวมเป็น ${userPoints[userId]} คะแนนแล้ว`, message.threadID);
                                    } else {
                                        api.sendMessage("ผลเครื่องสล็อตแมชชีน :\n | " + emojiresult1 + " | " + emojiresult2 + " | " + emojiresult3 + " | " + emojiresult4 + " |", message.threadID);
                                        userPoints[userId] -= betAmount;
                                        saveUserPoints();
                                        api.sendMessage(`คุณแพ้\nเสียไป ${betAmount} คะแนน คงเหลือ ${userPoints[userId]} คะแนน ลองใหม่อีกสักตาดู`, message.threadID);
                                    }
                                }
                            }
                        } else if (message.body == "cr." || message.body == "เครดิต" || message.body == "credit" || message.body == "cr") {
                            api.setMessageReaction("👍", message.messageID);
                            api.sendMessage({
                                body: "ผู้สร้าง\n" + "NINESOS", 
                                mentions: [{tag: "NINESOS", id: 100033015680359}]
                            }, message.threadID);
                        } else if (message.body.startsWith("!user")) {
                            const userId = message.senderID;
                            const fileData = fs.readFileSync("point.txt", "utf8");
                            const lines = fileData.split("\n");
                            const userExists = lines.some(line => line.startsWith(`${userId},`));
                        
                            if (!userExists) {
                                userPoints[userId] = 0;
                                saveUserPoints();
                                api.sendMessage(`ผู้ใช้ ${userId} ได้รับการเพิ่มลงในระบบแล้ว มีคะแนนเริ่มต้น 0 คะแนน`, message.threadID, message.messageID);
                            } else {
                                api.sendMessage(`ผู้ใช้ ${userId} มีอยู่แล้วในระบบ และมีคะแนนอยู่ที่ ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                            }
                        } else if (message.body.startsWith("!p")) {
                            const userId = message.body.split(" ")[1];
                            if (userId) {
                                const fileData = fs.readFileSync("point.txt", "utf8");
                                const lines = fileData.split("\n");
                                const userExists = lines.some(line => line.startsWith(`${userId},`));
                        
                                if (userExists) {
                                    const userPoint = userPoints[userId] || 0;
                                    api.sendMessage(`ผู้ใช้ ${userId} มีคะแนน ${userPoint} คะแนน`, message.threadID, message.messageID);
                                } else {
                                    api.sendMessage(`ผู้ใช้ ${userId} ยังไม่ได้ลงทะเบียนในระบบคะแนน`, message.threadID, message.messageID);
                                }
                            } else {
                                api.sendMessage("กรุณาระบุ 𝐈𝐃 ที่ต้องการดูคะแนน", message.threadID, message.messageID);
                            }
                        } else if (message.body.startsWith("!c")) {
                            const userId = message.senderID;
                            const fileData = fs.readFileSync("point.txt", "utf8");
                            const lines = fileData.split("\n");
                            const userExists = lines.some(line => line.startsWith(`${userId},`));
                        
                            if (!userExists) {
                                api.sendMessage("คุณยังไม่ได้รับการเพิ่มลงในระบบคะแนน กรุณาพิมพ์ '!𝐔𝐬𝐞𝐫' เพื่อเพิ่มตัวเองลงในระบบก่อน", message.threadID, message.messageID);
                                api.setMessageReaction("👎", message.messageID);
                            } else {
                                const betAmount = parseInt(message.body.split(" ")[1]);
                                if (betAmount < 5 || betAmount > 50 || isNaN(betAmount)) {
                                    api.sendMessage("กรุณาระบุจำนวนคะแนนที่ต้องการเดิมพันระหว่าง 5 ถึง 50 คะแนน", message.threadID, message.messageID);
                                    api.setMessageReaction("👎", message.messageID);
                                } else if (userPoints[userId] < betAmount) {
                                    api.sendMessage(`คุณมีคะแนนไม่พอ คุณมีคะแนนอยู่ที่ ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                                    api.setMessageReaction("👎", message.messageID);
                                } else {
                                    const result = Math.random();
                                    if (result < 0.4) {
                                        userPoints[userId] += betAmount;
                                        saveUserPoints();
                                        api.setMessageReaction("👍", message.messageID);
                                        api.sendMessage(`สุดยอดไปเลยไก่คุณชนะ!\nคุณได้รับคะแนนเพิ่ม ${betAmount} คะแนน รวมเป็น ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                                    } else if (result === 0.4) {
                                        userPoints[userId] -= betAmount / 2;
                                        saveUserPoints();
                                        api.setMessageReaction("👍", message.messageID);
                                        api.sendMessage(`ไก่คุณเสมอ!\nได้รับคืน ${betAmount / 2} คะแนน คงเหลือ ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                                    } else {
                                        userPoints[userId] -= betAmount;
                                        saveUserPoints();
                                        api.setMessageReaction("👍", message.messageID);
                                        api.sendMessage(`ไก่คุณแพ้\nเสียไป ${betAmount} คะแนน คงเหลือ ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                                    }
                                }
                            }
                        } else if (message.body.startsWith("!b")) {
                            const userId = message.senderID;
                            const fileData = fs.readFileSync("point.txt", "utf8");
                            const lines = fileData.split("\n");
                            const args = message.body.split(" ");
                            const userExists = lines.some(line => line.startsWith(`${userId},`));

                            if (args.length !== 3 || (args[1] !== "p" && args[1] !== "b" && args[1] !== "t") || isNaN(parseInt(args[2]))) {
                                api.sendMessage("รูปแบบคำสั่งไม่ถูกต้อง กรุณาใช้คำสั่ง '!𝐁 [𝐏|𝐓|𝐁] [𝟓-𝟓𝟎]'", message.threadID, message.messageID);
                                api.setMessageReaction("👎", message.messageID);
                                return;
                            }
                        
                            if (!userExists) {
                                api.sendMessage("คุณยังไม่ได้รับการเพิ่มลงในระบบคะแนน กรุณาพิมพ์ '!𝐔𝐬𝐞𝐫' เพื่อเพิ่มตัวเองลงในระบบก่อน", message.threadID, message.messageID);
                                api.setMessageReaction("👎", message.messageID);
                            } else {
                                const betAmount = parseInt(args[2]);
                                if (betAmount < 5 || betAmount > 50 || isNaN(betAmount)) {
                                    api.sendMessage("กรุณาระบุจำนวนคะแนนที่ต้องการเดิมพันระหว่าง 5 ถึง 50 คะแนน", message.threadID, message.messageID);
                                    api.setMessageReaction("👎", message.messageID);
                                } else if (userPoints[userId] < betAmount) {
                                    api.sendMessage(`คุณมีคะแนนไม่พอ คุณมีคะแนนอยู่ที่ ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                                    api.setMessageReaction("👎", message.messageID);
                                } else {
                                    const p = Math.floor(Math.random() * 10);
                                    const b = Math.floor(Math.random() * 10);

                                    api.sendMessage(`P: ${p}\nB: ${b}`, message.threadID,  message.messageID);
                                    
                                    if (args[1] === "p" && p > b || args[1] === "b" && p < b || args[1] === "b" && b > p || args[1] === "p" && b < p) {
                                        userPoints[userId] += betAmount;
                                        saveUserPoints();
                                        api.setMessageReaction("👍", message.messageID);
                                        api.sendMessage(`สุดยอดไปเลยคุณชนะ!\nคุณได้รับคะแนนเพิ่ม ${betAmount} คะแนน รวมเป็น ${userPoints[userId]} คะแนนแล้ว`, message.threadID, message.messageID);
                                    } else if (args[1] === "b" && b < p || args[1] === "p" && b > p  || args[1] === "b" && p > b || args[1] === "p" && p < b || args[1] === "t" && b < p || args[1] === "t" && b > p) {
                                        userPoints[userId] -= betAmount;
                                        saveUserPoints();
                                        api.setMessageReaction("👍", message.messageID);
                                        api.sendMessage(`คุณแพ้\nเสียไป ${betAmount} คะแนน คงเหลือ ${userPoints[userId]} คะแนน`, message.threadID, message.messageID);
                                    } else if (args[1] === "t" && b == p || args[1] === "t" && p == b) {
                                        userPoints[userId] += betAmount * 7;
                                        saveUserPoints();
                                        api.setMessageReaction("👍", message.messageID);
                                        api.sendMessage(`แจ็กพ็อต!!!\nสุดยอดไปเลยคุณชนะ!\nคุณได้รับคะแนนเพิ่ม ${betAmount * 7} คะแนน รวมเป็น ${userPoints[userId]} คะแนนแล้ว`, message.threadID, message.messageID);
                                    }
                                }
                            }
                        } else if (message.body.startsWith("^")) {
                            const text = message.body.slice(1).trim();
                            api.sendMessage("ส่งคำร้องไปเรียบร้อยครับ", message.threadID, message.messageID);
                            api.setMessageReaction("👍", message.messageID);
                            api.sendMessage({
                                body: "ผู้ใช้: " + "USER" + "\n\n" +text, 
                                mentions: [{tag: "USER", id: message.senderID}]
                            }, 7687946187893875);
                        } else if (message.body.toLowerCase() === "xo") {
                            const threadID = message.threadID;
                            if (!xoBoards[threadID]) {
                                xoBoards[threadID] = {
                                    board: ["", "", "", "", "", "", "", "", ""],
                                    turn: "X",
                                    moveCount: 0
                                };
                                const boardStr = renderBoard(xoBoards[threadID].board);
                                api.sendMessage(`เริ่มเกม XO ใหม่\n\n${boardStr}`, threadID);
                            } else {
                                api.sendMessage("เกมกำลังดำเนินอยู่แล้ว", threadID);
                            }
                        } else if (message.body.match(/^xo \d$/)) {
                            const threadID = message.threadID;
                            const moveIndex = parseInt(message.body.slice(3)) - 1;
                            if (xoBoards[threadID] && xoBoards[threadID].board[moveIndex] === "") {
                                xoBoards[threadID].board[moveIndex] = xoBoards[threadID].turn;
                                xoBoards[threadID].moveCount++;
                                const winner = getWinner(xoBoards[threadID].board);
                                if (winner) {
                                    const boardStr = renderBoard(xoBoards[threadID].board);
                                    api.sendMessage(`${winner} ชนะ!\n\n${boardStr}`, threadID);
                                    delete xoBoards[threadID];
                                } else if (xoBoards[threadID].moveCount === 9) {
                                    const boardStr = renderBoard(xoBoards[threadID].board);
                                    api.sendMessage(`เสมอ\n\n${boardStr}`, threadID);
                                    delete xoBoards[threadID];
                                } else {
                                    xoBoards[threadID].turn = xoBoards[threadID].turn === "X" ? "O" : "X";
                                    const boardStr = renderBoard(xoBoards[threadID].board);
                                    api.sendMessage(`คิวของ ${xoBoards[threadID].turn}\n\n${boardStr}`, threadID);
                                }
                            }
                        } else {
                            fs.readFile("key.txt", "utf8", (err, data) => {
                                if (err) {
                                    console.error("เกิดข้อผิดพลาดในการอ่านไฟล์:", err);
                                    return;
                                }
                                const lines = data.split("\n").filter(line => line.trim() !== "");
                                if (randomMessageEnabled[message.threadID]) {
                                    const randomIndex = Math.floor(Math.random() * lines.length);
                                    const randomMessage = lines[randomIndex];
                                    api.sendMessage(randomMessage, message.threadID, message.messageID);
                                }
                            });
                        }

                    }
                }
            });
        });
    });
});

function saveUserPoints() {
    const data = Object.entries(userPoints)
        .map(([user, point]) => `${user},${point}`)
        .join("\n");

    fs.writeFile("point.txt", data, "utf8", err => {
        if (err) {
            console.error("เกิดข้อผิดพลาดในการบันทึกไฟล์ point.txt:", err);
        }
    });
}

function renderBoard(board) {
    return `
 ${board[0]} | ${board[1]} | ${board[2]}
---+---+---
 ${board[3]} | ${board[4]} | ${board[5]}
---+---+---
 ${board[6]} | ${board[7]} | ${board[8]}
`;
}

function getWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // แนวนอน
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // แนวตั้ง
        [0, 4, 8], [2, 4, 6]             // แนวทแยงมุม
    ];
    for (let [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // ชนะ
        }
    }
    return null; // ยังไม่มีผู้ชนะ
}

function calculate(a, b, operator) {
    switch (operator) {
        case "+":
            return a + b;
        case "-":
            return a - b;
        case "*":
            return a * b;
        case "/":
            return a / b;
        default:
            return "ไม่รู้จักตัวดำเนินการ";
    }
}

function appendAndSaveTextToFile(text, api, message) {
    return new Promise((resolve, reject) => {
        fs.readFile("key.txt", "utf8", (err, data) => {
            if (err) {
                console.error("เกิดข้อผิดพลาดในการอ่านไฟล์:", err);
                reject(err);
                return;
            }
            const lines = data.split("\n").filter(line => line.trim() !== "");
            if (lines.includes(text)) {
                const errorMessage = `คำ "${text}" ซ้ำกับที่มีอยู่`;
                reject(new Error(errorMessage));

                return;
            }
            fs.appendFile("key.txt", `${text}\n`, "utf8", err => {
                if (err) {
                    console.error("เกิดข้อผิดพลาดในการเพิ่มข้อความ:", err);
                    reject(err);
                    return;
                }
                fs.writeFile("key.txt", data + `${text}\n`, "utf8", err => {
                    if (err) {
                        console.error("เกิดข้อผิดพลาดในการบันทึกไฟล์:", err);
                        reject(err);
                        return;
                    }
                    const successMessage = `เพิ่มคำ "${text}" สำเร็จ`;
                    resolve(successMessage);
                });
            });
        });
    });
}

function deleteWordFromFile(wordToDelete, api, message) {
    return new Promise((resolve, reject) => {
        fs.readFile("key.txt", "utf8", (err, data) => {
            if (err) {
                console.error("เกิดข้อผิดพลาดในการอ่านไฟล์:", err);
                reject(err);
                return;
            }
            let lines = data.split("\n").filter(line => line.trim() !== "");
            if (!lines.includes(wordToDelete)) {
                const errorMessage = `คำ "${wordToDelete}" ไม่พบในรายการ`;
                reject(new Error(errorMessage));
                return;
            }
            lines = lines.filter(line => line.trim() !== wordToDelete);
            const updatedData = lines.join("\n") + "\n";
            fs.writeFile("key.txt", updatedData, "utf8", err => {
                if (err) {
                    console.error("เกิดข้อผิดพลาดในการลบคำ:", err);
                    reject(err);
                    return;
                }
                const successMessage = `ลบคำ "${wordToDelete}" ออกจากรายการแล้ว`;
                resolve(successMessage);
            });
        });
    });
}

function appendAndSaveTextToFileid(text, api, message) {
    return new Promise((resolve, reject) => {
        fs.readFile("threadID.txt", "utf8", (err, data) => {
            if (err) {
                console.error("เกิดข้อผิดพลาดในการอ่านไฟล์:", err);
                reject(err);
                return;
            }
            const lines = data.split("\n").filter(line => line.trim() !== "");
            if (lines.includes(text)) {
                const errorMessage = `เธรด "${text}" ซ้ำกับที่มีอยู่`;
                reject(new Error(errorMessage));

                return;
            }
            fs.appendFile("threadID.txt", `${text}\n`, "utf8", err => {
                if (err) {
                    console.error("เกิดข้อผิดพลาดในการเธรด:", err);
                    reject(err);
                    return;
                }
                fs.writeFile("threadID.txt", data + `${text}\n`, "utf8", err => {
                    if (err) {
                        console.error("เกิดข้อผิดพลาดในการบันทึกไฟล์:", err);
                        reject(err);
                        return;
                    }
                    const successMessage = `เพิ่มเธรด "${text}" สำเร็จ`;
                    resolve(successMessage);
                });
            });
        });
    });
}

function deleteWordFromFileid(wordToDelete, api, message) {
    return new Promise((resolve, reject) => {
        fs.readFile("threadID.txt", "utf8", (err, data) => {
            if (err) {
                console.error("เกิดข้อผิดพลาดในการอ่านไฟล์:", err);
                reject(err);
                return;
            }
            let lines = data.split("\n").filter(line => line.trim() !== "");
            if (!lines.includes(wordToDelete)) {
                const errorMessage = `เธรด "${wordToDelete}" ไม่พบในรายการ`;
                reject(new Error(errorMessage));
                return;
            }
            lines = lines.filter(line => line.trim() !== wordToDelete);
            const updatedData = lines.join("\n") + "\n";
            fs.writeFile("threadID.txt", updatedData, "utf8", err => {
                if (err) {
                    console.error("เกิดข้อผิดพลาดในการลบเธรด:", err);
                    reject(err);
                    return;
                }
                const successMessage = `ลบเธรด "${wordToDelete}" ออกจากรายการแล้ว`;
                resolve(successMessage);
            });
        });
    });
}

async function getWeatherData(city) {
    const fetch = await import('node-fetch').then(module => module.default);
    const apiKey = '2606f769271b8d545fe3458b2b72ed9f';
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.cod === 200) {
            return data;
        } else {
            console.error(`Error: ${data.message}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

function createResponseMessage(weatherData) {
    const {
        name: cityName,
        main: { temp: temperature, temp_max: tempMax, temp_min: tempMin, feels_like: feelsLike, pressure, humidity },
        sys: { country, sunrise, sunset },
        coord: { lon, lat },
        weather: [{ main }]
    } = weatherData;

    const responseMessage = `ประเทศ: ${country}
ชื่อเมือง: ${cityName}
อุณหภูมิ: ${temperature}°C
อุณหภูมิสูงสุด: ${tempMax}°C
อุณหภูมิต่ำสุด: ${tempMin}°C
รู้สึกเหมือน: ${feelsLike}°C
ความดันบรรยากาศ: ${pressure} hPa
ความชื้น: ${humidity}%
ละติจูด: ${lat}
ลองจิจูด: ${lon}
สภาพอากาศ: ${main}
พระอาทิตย์ขึ้น: ${new Date(sunrise * 1000).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}
พระอาทิตย์ตก: ${new Date(sunset * 1000).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

    return responseMessage;
}

function generateRandomNumbers(count) {
    const numbers = [];
    for (let i = 0; i < count; i++) {
        numbers.push(Math.floor(Math.random() * 10));
    }
    return numbers;
}

function isLink(text) {
    const linkRegex = /(http|https):\/\/[^\s$.?#].[^\s]*$/;
    return linkRegex.test(text);
}

function textToSpeech0(text, api, threadID, messageID) {
    const language = 'th';
    const ttsUrl = googleTTS.getAudioUrl(text, { lang: language, slow: false, host: 'https://translate.google.com', splitPunct: false });

    const download = (url, dest, cb) => {
        const file = fs.createWriteStream(dest);
        const sendFile = () => {
            api.sendMessage({ attachment: fs.createReadStream(dest) }, threadID, () => {
                fs.unlinkSync(dest);
                if (cb) cb();
            });
        };
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(sendFile);
            });
        }).on('error', (err) => {
            fs.unlinkSync(dest);
            console.error("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์:", err.message);
        });
    };

    download(ttsUrl, 'tts.mp3');
}