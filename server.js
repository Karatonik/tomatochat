let express = require('express');

let app = express();

app.use(express.static(__dirname+'/dist/angular-chat-app'));

app.get('/*',(req, res)=>{
    req.sendFile(__dirname+'/dist/angular-chat-app/index.html');
});

app.listen(process.env.PORT || 8080);
