// VoteServ - standalone irc vote bot written in node.js
var log = require('log-simple')({init: false});

var VERSION = '0.2.1';

log.info('Planning Poker' + VERSION + ' starting...');
log.info('Written by Emanuele Pintaldi');

// parse config
var config = require('./config.json');
if (config && config.network
  && config.network.address && config.network.port && config.network.channels
  && config.network.nick && config.administration.admin) {
    log.info('Loaded config from config.json -', JSON.stringify(config));
} else {
  log.error('Invalid config, see README.md');
  process.exit(1);
}

// irc library
var coffea = require('coffea'),
    net    = require('net');

// connect to server
var stream = net.connect({
  port: config.network.port,
  host: config.network.address
});
var client = coffea(stream);

// set nick and user information
client.nick(config.network.nick);
client.user(config.network.nick, config.network.nick);

// set admin user
var admin = config.administration.admin;

// bot is connected to network, (identify and) join channels
client.on('motd', function (motd) {
  if (config.network.nickserv) {
    client.send('NickServ', 'IDENTIFY ' + config.network.nickserv);
  }

  client.join(config.network.channels);
});

// bot begins here

var votes = [];
var users = [];
users.push(admin);
var issue;	

function parseVote(event, cmd, args) {
  if (!cmd) cmd = args.shift();
  if (issue==null)
  {
  	client.send(event.channel ? event.channel : event.user,'There is no open votation!');
    return;
  }
  if (args.length == 0) {
    client.whois(event.user.getNick(), function(err, res) {
      var user = res['account'];
      var nick = res['nick'];
      var vote = {};
      vote['vote'] = cmd;
      vote['user'] = nick;
      {
          for (i=0; i<votes.length; i++)
          {
            if (votes[i].user == nick)
            {
              client.send(event.channel ? event.channel : event.user,
                'You already voted');
              return;
            }
          }
          log.info('vote: ', vote);
        if (vote.vote=="0.5" || vote.vote=="1" || vote.vote=="2" || vote.vote=="3" || vote.vote=="5" || vote.vote=="8" || vote.vote=="13" || vote.vote=="20" || vote.vote=="40" || vote.vote=="80" || vote.vote=="100"){
            log.debug(nick, ' voted ', cmd);
            votes.push(vote);
            client.send(event.channel ? event.channel : event.user, nick + ' voted ' + cmd);
        }
        else{  
        client.send(event.channel ? event.channel : event.user, 'Wrong value! (0.5,1,2,3,5,8,13,20,40,80,100)');
        }
      }
    });
  } else {
    client.send(event.channel ? event.channel : event.user,
      'Too many arguments.');
  }
  log.debug(votes);

  return;
}

function parseCommand(event, cmd, args) {
    nick = event.user.getNick();
    //Intercept vote keyword (ex. vote 5)
  if (cmd.substr(0, 4) == "vote") return parseVote(event, cmd.substr(4), args);
    //Accept also numeric vote without vote keyword(ex. 5)
    if (isNumber(cmd)) return parseVote(event, cmd, args);
  else {
    if (nick.localeCompare(admin)==0){
    	switch (cmd) {
      	case 'open':
        	notifyAll('Now you can vote issue ' + args[0] );
        	issue = args[0];
      	break;
      	case 'results':
            getResults();
      	break;
      	case 'close':
      	  if (issue==null)
  			{
  				client.send(event.channel ? event.channel : event.user,'There is no open votation!');
    			return;
  			}
            getResults();
      		notifyAll('Votation closed for issue ' + issue);
      		issue=null;
      		votes=[];
	    break;
    	case 'who':
    	case 'whovoted':
    	for (i=0; i<votes.length; i++)
      	{
          client.send(event.channel ? event.channel : event.user,'User: ' + votes[i].user + " | " + votes[i].vote);
        }
        return;
      	break;
    	}
    }
    else
    {
		switch (cmd) {
      	case 'source':
      	case 'version':
        	client.send(event.channel, 'VoteServ v' + VERSION);
      	break;
                
        case 'hi':
        users.push(event.user.nick);
        break;
    	}    
    }
    return;
  	}
}
function getResults(){
    if (issue==null){
        client.send(event.channel ? event.channel : event.user,'There is no open votation!');
        return;
    }
    votesum=0;
    numberOfVotes = votes.length;
    if (numberOfVotes<=2){
        for (i=0;i<votes.length;i++){
            votesum = +votesum + +votes[i].vote;
        }
        midValue = votesum / numberOfVotes;
    }
    else {
        votes2 = [];
        for (i=0;i<votes.length;i++){
            votes2.push(+votes[i].vote);
        }
        votes2 = votes2.sort(function (a, b) {  return a - b;  });
        log.debug('votes2: ',votes2);
        for (i=1;i<votes2.length - 1;i++){
            votesum = +votesum + +votes2[i];
        }
        midValue = votesum / (numberOfVotes - 2);
        midvalue = getCorrectValue(midValue);
    }
    notifyAll('The result for votation on ' + issue + ' is ' + midValue);
}

function notifyAll(message){
    for (i=0;i<users.length;i++)
    {
        client.send(users[i],message);
    }
}

function getCorrectValue(value){
    correctValues = [0.5,1,2,3,5,8,13,20,40,80,100];
    distances = [];
    previousValue = 999;
    currentIndex = null;
    for(i=0;i<correctValues.length;i++){
        currentValue = Math.abs(value - correctValues[i]);
        if ( /*previousValue != null && */ currentValue < previousValue) {
          previousValue = currentValue;
          currentIndex = i;
        }
    }
    return correctValues[currentIndex];
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

// parse channel messages
client.on('message', function(event) {
  if (event.message.substr(0, 1) == '!') { // prefix parsing
    var args = event.message.substr(1).split(' ');
    var cmd = args.shift();
    return parseCommand(event, cmd, args.length > 0 ? args : []);
  }
});

// parse private messages
client.on('privatemessage', function(event) {
  log.debug('Message received: ', event.message);
  var args = event.message.split(' ');
  var cmd = args.shift();
  log.debug('cmd: ', cmd);
  log.debug('args: ', args);
  return parseCommand(event, cmd, args.length > 0 ? args : []);
});