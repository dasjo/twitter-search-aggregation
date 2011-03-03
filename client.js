var counter = [];
counter["tags"] = [];
counter["user_mentions"] = [];
var maxItemCount = 0;
var itemLimit = 5;

var tweetLimit = 15;
var ws;

var currentTerm = "";

function processCounter(items, type) {
  if(items.length > 0) {
    $.each(items, function(index) {
      switch(type) {
        case "user_mentions":
          text = items[index].screen_name;
          break;
        case "tags":
          text = items[index].text;
      }

      itemName = text;
      if(typeof counter[type][itemName] == "undefined") {
        counter[type][itemName] = 1;
      }
      else {
        count = counter[type][itemName]++;
        if(count > maxItemCount) {
          maxItemCount = count;
        }
      }
    });

    itemHTML = 
      "<a href=\"#\" onclick=\"invokeSearch('" + itemName + "');\">"
      + counter[type][itemName] + " " + itemName + "</a>";

    listId = "#" + type;
    itemId = listId + "_" + itemName;
    
    if($(itemId).length == 0) {
      // create new item in list, onClick notifies server to search for
      $(listId).append(
          "<li class=\"item\" id=\"" + type + "_" + itemName + "\">" + itemHTML + "</li>");
    }
    else {
      // update existing item in list
      $(itemId).a.html(counter[type][itemName] + " " + itemName);
    }

    $(listId + ">li").tsort("",{order:"desc"});

    if($(listId + " li").size() > itemLimit && itemLimit > 1) {
      $(listId + " li:last").slideDown(100, function() {
        $(this).remove();
      });
    }

    incItem(itemName, type);
  }
}

function reset(type) {
  counter[type] = [];
  $("#" + type + " li").slideDown(100, function() {
    $(this).remove();
  });
  chartsReset(type);
}

function invokeSearch(term) {
  $("#searchterm").html(term);
  ws.send(term);
  if(currentTerm != "") {
    addTweet("old results for " + currentTerm);
    addTweet("&nbsp;");
  }
  currentTerm = term;
}

function incItem(itemName, type) {
  chartsIncItem(itemName, type);
}

function addTweet(html) {
    //add tweet to list
    var p = $("<div class='tweet' style='display:none'>" + html + "</div>");
    
  if($('#tweets div.tweet').size() > tweetLimit) {
    $('#tweets div.tweet:last').slideDown(100, function() {
      $(this).remove();
    });
  }
  $('#tweets').prepend(p);
    p.slideDown(140);
}

function processServerInput(evt) {
  data = eval("(" + evt.data + ")");
  //data = jQuery.parseJSON("(" + evt.data + ")");
  
  var hashtags = data.entities.hashtags;
  processCounter(hashtags, "tags");

  var user_mentions = data.entities.user_mentions;
  processCounter(user_mentions, "user_mentions");

  //add tweet to list
  addTweet("<div class='content'><a class='main-screenname' href='http://www.twitter.com/" + data.user.screen_name + "/status/" + data.id + "' target='_blank'>" + data.user.screen_name + "</a> " + data.text + "</div>");

  //drawSort();
}

//start document.ready
$(document).ready(function(){
  $("#searchbox").bind("keypress", function(e) {
    if(e.which == 13) {
      invokeSearch($("#searchbox").val());
    }
  }); 

  if(!("WebSocket" in window)) {
    alert("Sorry, the build of your browser does not support WebSockets. Please use latest Chrome or Webkit nightly");
    return;
  }
  
  ws = new WebSocket("ws://localhost:8081/");
  ws.onmessage = processServerInput;
  ws.onclose = function() {
    alert("socket closed\n\nmake sure server is running\n\nUsage: node server.js <twitter_username> <twitter_password>");
  };
  ws.onopen = function() {
    invokeSearch("search");
  };

}); //end document.ready



//start google charts
google.load('visualization', '1', {'packages': ['table', 'map', 'corechart']});
google.setOnLoadCallback(chartsInit);

var charts = [];
charts["tags"] = [];
charts["user_mentions"] = [];

function chartsIncItem(itemName, type) {
  data = charts[type]["data"]; 
  if(data == null) { return; }

  rows = data.getFilteredRows([{column: 0, value: itemName}]);
  if(rows.length < 1) {
    data.addRow([itemName, 1]);
  }
  else {
    data.setCell(rows[0], 1, data.getValue(rows[0], 1) + 1);
  }  
  chartsDraw(type);
}

function chartsInit() {
  chartsReset("tags");
  chartsReset("user_mentions");
}

function chartsReset(type) {
  data = charts[type]["data"] = new google.visualization.DataTable();
  data.addColumn('string', 'tag');
  data.addColumn('number', 'mentions');
  /*
  data.addRows(2);
  data.setCell(0, 0, 'John');
  data.setCell(0, 1, 2);
  data.setCell(1, 0, 'Mary');
  data.setCell(1, 1, 5);
  */
  chartsDraw(type);
}

function chartsDraw(type) { 
  data = charts[type]["data"]; 
  data.sort([{column: 1, desc: true}]);

  var formatter = new google.visualization.NumberFormat({prefix: '#'});
  formatter.format(data, 1); // Apply formatter to second column

  view = charts[type]["view"] = new google.visualization.DataView(data);
  if(view.getNumberOfRows() > itemLimit) {
    view.hideRows(itemLimit, view.getNumberOfRows() -1);
  }
  view.setColumns([0, 1]);

  chart = charts[type]["chart"] = new google.visualization.BarChart(document.getElementById('chart_' + type));
  chart.draw(view);

  //table = new google.visualization.Table(document.getElementById('table_sort_div'));
  //table.draw(view);
}

//end google charts
