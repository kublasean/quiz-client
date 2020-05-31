const ServerStateEnum = {
	LOBBY: 0,
	STARTING: 1,
	QUESTION: 2,
	ANSWER: 3,
    SCORES: 4,
	DONE: 5
};
var isHost = false;

function getPlayerHtml(player) {
    if (player == null || player.name == null || player.connected == null || player.score == null) { return ""; }
    var color = player.connected ? "green" : "grey";
    var html = `<div class='player' style='color: ${color}; background-image: url("${player.icon}")'>`;
    html += "<p>" + player.score + " pts.</p></div>";
    //html += "<img src='" + player.icon + "'/>";
    html += "<p>" + player.name + "</p>";
    return html;
}

function getChoiceHtml(choice) {
    var html = "<button class='choice'>" + choice + "</button>";
    return html;
}

function onLogin(name, score) {
    $("#USER").show();
    $("#USERNAME").html(name);
    $("#SCORE").html(score);
}

function onStatus(data, sock) {
    console.log(data);
    
    if (data == "admin") {
        $("#ADMIN").show();
        onLogin("admin", " ");
        $("form").hide();
        $("#LOBBY_PLAYERS").show();
        isHost = true;
        return;
    }
    
    var json = JSON.parse(data);
    if (json == null || json.server == null || json.server.state == null) { 
        return; 
    }
    
    if (json.client != null && json.client.index != null) {
        onLogin(json.server.players[json.client.index].name, json.server.players[json.client.index].score);
    }
    
    
    switch (json.server.state) {
        case ServerStateEnum.LOBBY: {
            $("#LOBBY").show();
            
            if (json.server.players != null && json.server.players.length >= 1) {
                var html = "";
                json.server.players.forEach((player) => {
                    html += getPlayerHtml(player);
                });
                $("#LOBBY_PLAYERS").html(html);
            }
            if (json.client == null || json.client.index == null) {
                if (!isHost) { 
                    $("form").show(); 
                    $("#LOBBY_PLAYERS").hide();
                    $("#USER").hide();
                }
            } 
            else {
                $("form").hide();
                $("#LOBBY_PLAYERS").show();
            }
            break;
        }
        case ServerStateEnum.QUESTION: {
            $("#QUESTION_WAITING").text(json.server.waitingOn);
            $("#QUESTION_PROMPT").text(json.server.prompt);
            $("#QUESTION_NUM").text(json.server.number);
            
            var html = "";
            json.server.choices.forEach((choice) => {
                html += getChoiceHtml(choice);
            });
            $("#QUESTION_CHOICES").html(html);
            
            $(".choice").click(function() {
                var resp = {
                    answer: $(this).text()
                }
                console.log(resp);
                sock.send(JSON.stringify(resp));
            });
            break;
        }
        case ServerStateEnum.ANSWER: {
            $("#QUESTION_PROMPT").text(json.server.prompt);
            $("#QUESTION_NUM").text(json.server.number);
            $("#ANSWER").find("h1").text(json.server.correct);
            break;
        }
        case ServerStateEnum.SCORES: {
            console.log(json.server.ranked);
            var html = "";
            json.server.ranked.forEach((p) => {
                html += getPlayerHtml(p);
            });
            $("#SCORES").html(html);
            break;
        }
        case ServerStateEnum.DONE: {
            $("#DONE").find("h1").text(json.server.ranked[0].name);
            break;
        }
        default: {
            return;
        }
    }
}


$(document).ready(() => {
    console.log("document loaded");
    $("form").submit(function(e) {
        e.preventDefault();
    });
    
    var sock = new WebSocket("wss://" + location.hostname + ":3000/");

    // init button callbacks here
    sock.onopen = function() {
        console.log("opened websocket");
        
        $("form").submit(function(e) {
            e.preventDefault();
            
            console.log($(this).serializeArray());
            
            var resp = {
                password: $(this).find("input[name='password']").val(),
                name: $(this).find("input[name='name']").val()
            };
                                    
            sock.send(JSON.stringify(resp));
        });
        
        $("#NEXT").click(function() {
            sock.send("next");
        });
        
        
        
    };
    
    sock.onmessage = function(event) {
        onStatus(event.data, sock);
    };
    

});
