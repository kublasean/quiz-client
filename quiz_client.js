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
    var color = player.connected ? "Lime" : "GoldenRod";
    var html = `<div class='player' style='border-color: ${color}; background-image: url("${player.icon}")'>`;
    html += "<p>" + player.score + " pts.</p>";
    html += "<p>" + player.name + "</p></div>";
    return html;
}

function getChoiceHtml(choice) {
    var html = "<div><button class='choice'>" + choice + "</button></div>";
    return html;
}

function onLogin(name, score) {
    $("#USER").show();
    $("#USERNAME").html(name);
    //$("#SCORE").html(score);
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
            $("#QUESTION").hide();
            $("#QUESTION_WAITING").hide();
            $("#ANSWER").hide();
            $("#SCORES").hide();
            $("#DONE").hide();
            
            if (json.server.players != null && json.server.players.length >= 1) {
                var html = "<h2>Lobby</h2>";
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
            $("#LOBBY").hide();
            $("#ANSWER").hide();
            $("#SCORES").hide();
            $("#DONE").hide();
            $("#QUESTION_WAITING").text(json.server.waitingOn);
            $("#QUESTION_PROMPT").text(json.server.prompt);
            $("#QUESTION_NUM").text(json.server.number);
            
            console.log(json);
            
            var html = "";
            json.server.choices.forEach((choice) => {
                html += getChoiceHtml(choice);
            });
            $("#QUESTION_CHOICES").html(html);
            
            if (json.client != null && json.client.answered != null) {
                if (json.client.answered == true) {
                    console.log("answered");
                    $("#QUESTION_CHOICES").hide();
                    $("#QUESTION_WAITING").fadeIn();
                } else {
                    console.log("did not answer");
                    $("#QUESTION_CHOICES").fadeIn();
                }
            } 
            else if (isHost) {
                console.log("is host");
                $("#QUESTION_WAITING").show();
            }
                        
            $(".choice").click(function() {
                var resp = {
                    answer: $(this).text()
                }
                console.log(resp);
                sock.send(JSON.stringify(resp));
            });
            
            $("#QUESTION").fadeIn();
            break;
        }
        case ServerStateEnum.ANSWER: {   
            $("#LOBBY").hide();
            $("#SCORES").hide();
            $("#DONE").hide();      
            
            var node = $("#ANSWER").find("h1");
            node.hide();
            node.text(json.server.correct);
            
            $("#QUESTION").fadeOut(() => {
                $("#QUESTION_WAITING").hide();
                $("#ANSWER").fadeIn(() => {
                    node.fadeIn("slow");
                });
            });
            
            break;
        }
        case ServerStateEnum.SCORES: {
            $("#LOBBY").hide();
            $("#QUESTION").hide();
            $("#QUESTION_WAITING").hide();
            $("#DONE").hide();
            
            var html = "<h2>Standings</h2>";
            json.server.players.forEach((p) => {
                html += getPlayerHtml(p);
            });
            $("#SCORES").html(html);
            
            $("#ANSWER").fadeOut(() => {
                $("#SCORES").fadeIn();
            });
            break;
        }
        case ServerStateEnum.DONE: {
            $("#LOBBY").hide();
            $("#QUESTION").hide();
            $("#QUESTION_WAITING").hide();
            $("#ANSWER").hide();
            
            var max = 0;
            var winner = "";
            json.server.players.forEach((p) => {
                if (p.score > max) {
                    winner = p.name;
                    max = p.score;
                } else if (p.score == max) {
                    winner += p.name + " ";
                }
            });
            
            $("#DONE").find("h1").text(winner);
            
            $("#SCORES").fadeIn();
            $("#DONE").fadeIn();
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
    
    var sock = null;
    try {
        // production
        sock = new WebSocket("wss://" + location.hostname + ":3000/");
    }
    catch (err) {
        // local development
        try {
            sock = new WebSocket("ws://localhost:3000/");
        }
        catch (err) {
            console.log("Server not running...")
        }
    }

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

    sock.onerror = function(error) {
        console.log("on error");
        console.log(error);
    };

    /*onStatus(JSON.stringify({
        server: {
            players: [{
                score: 0,
                name: "Player 1",
                connected: "true",
                icon: "frog1.jpg"
            }],
            state: ServerStateEnum.QUESTION,
            waitingOn: "",
            prompt: "This is a dummy question?",
            choices: ["a","b","c","d"],
            number: "Question 1 of 20"
        },
        client: {
            index: 0,
            answered: false
        }
    }));

    $("#LOBBY").hide();
    $("#ANSWER").hide();
    $("#DONE").hide();
    $("#QUESTION_WAITING").hide();
    $("#QUESTION").hide();*/

});
