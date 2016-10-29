PokerBot
========

_standalone irc poker plan vote bot written in node.js_


Requirements
------------

You need to have node.js and npm installed.


Installation
------------

Download PokerBot from github: `git clone https://github.com/manueligno78/pokerbot`.

Install dependencies: Run `npm install` in the PokerBot directory.


Configuration
-------------

Now create a `config.json` file in the PokerBot directory. It should look like
the example below. More networks can be added. (Config is JSON format)
```
{
  "network": {
    "address": "localhost",
    "port": 6667,
    "channels": ["#lounge"],
    "nick": "PokerBot",
    "admin": "dan",
    "nickserv": "[redcated]"
  },
  "administration": {
    "admin": "admin"
  }   
}
```


Running
-------

Simply run `node main.js` and the bot should connect to the configured networks.
