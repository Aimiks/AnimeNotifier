var extension = chrome.extension.getBackgroundPage();
var intervals = [];
var oldAnimesData = [];

const scale = (num, in_min, in_max, out_min, out_max) => {
  return ((num - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
};

function dateToCountDown(sec) {
  var d = Math.floor(sec / (3600 * 24));
  var h = Math.floor((sec / 3600) % 24);
  var m = Math.floor((sec / 60) % 60);
  var s = Math.round(sec % 60);
  if (d < 10) {
    d = "0" + d;
  }
  if (h < 10) {
    h = "0" + h;
  }
  if (m < 10) {
    m = "0" + m;
  }
  if (s < 10) {
    s = "0" + s;
  }
  return `${d}d ${h}h ${m}m ${s}s`;
}

/**
 * Draw the part of the view based on the entry
 * @param {*} entry : anime entry
 */
function draw(entry) {
  let div_infos = "";
  let typeUser = extension.user.type;
  // Get existing anime line
  let animeLine = $(`.animeLine[data-id=${entry.media.id}]`);
  let line_exist = animeLine.length !== 0;
  // Remove content of the line
  $(`.animeLine[data-id=${entry.media.id}] > *`).remove();
  // We create the line if there is none for this entry
  if (!line_exist) {
    animeLine = $(
      `<div data-id=${entry.media.id} class='animeLine ${entry.status === "AIRING" ? "airing" : "up"} ${
        entry.dl && entry.dl.length ? "withDl" : ""
      }'></div>`
    );
  }
  // next episode is the nextAiringEpisode or the actual entry progress + 1
  let nextEp = entry.media.nextAiringEpisode ? entry.media.nextAiringEpisode.episode : entry.progress + 1;
  if (entry.status === "AIRING") {
    var diff = entry.time;
    var dateAiringString = dateToCountDown(diff);
    div_infos = `<div data-id=${entry.media.id} class='animeCountDown'>${dateAiringString}</div>`;
  } else if (entry.status === "UP") {
    // If the entry has a "UP" status the nextEp is the user progress + 1
    nextEp = entry.progress + 1;
    // We have download links
    if (entry.dl && entry.dl.length) {
      div_infos = `<div data-id=${entry.media.id} class='animeIsUpWithDl'>`;
      entry.dl.forEach((dl, ind) => {
        // maximum is 3 atm but only 2 bc of the design
        if (ind < 2) {
          div_infos += `<div class='downloadInteractionContainer'>`;
          var notStrictClass = dl.strict ? "" : "notStrict ";
          var title = dl.strict
            ? dl.name
            : `Result isn't strict. This can lead to an anime with a similar name.\nPlease verify the name before downloading.\n\n${dl.name}`;
          div_infos += `<a class='dlButton dlMagnet ${notStrictClass}' href="${dl.magnet}" title="Magnet download\n--\n${title}">${svgMagnet}</a>`;
          div_infos += `<a class='dlButton dlLink ${notStrictClass}' href="${dl.dlLink}" title="Direct download\n--\n${title}">${svgDl}</a>`;
          div_infos += `<a class='dlButton dlPage' href="${dl.mainPage}" title="Go to download page\n--\n${title}">${svgPage}</a>`;
          div_infos += `<div class='ratio'>
                        <span title="Ratio up" class="upRatio">${dl.up}</span><span title="Ratio down" class="downRatio">${dl.down}</span>
                    </div>`;

          div_infos += `</div>`;
        }
      });
      div_infos += "</div>";
    } else {
      div_infos = `<div data-id=${entry.media.id} class='animeIsUp'>Searching links... </div>`;
    }
  }
  // Draw badges (ep behind, new, ep number...)
  let badges = $(`<div class='badges'></div>`).append(`<div class='epNumber'>${nextEp}</div>`);
  if (entry.new) {
    badges.append($(`<div class='new'>New</div>`));
  } else if (entry.behind) {
    badges.append($(`<div class='behind'>${entry.behind}<span class='textBehind'>&nbsp;ep. behind</span></div>`));
  }
  let animeLineContent = $(
    `<div class='infosContainer' style='background-image:url(${entry.media.coverImage.extraLarge})'></div>`
  ).append("<div class='blurBg'></div>");
  if (entry.status === "AIRING") {
    animeLineContent.append(
      `<div class='bgContainer'>
          <div class='bg glitch glitch--style-1'>
              <div class="glitch__img"></div>
              <div class="glitch__img"></div>
              <div class="glitch__img"></div>
              <div class="glitch__img"></div>
              <div class="glitch__img"></div>
          </div>
      </div>`
    );
  } else {
    animeLineContent.append(`<div class='bgContainer'></div>`);
  }
  let animeLink =
    typeUser === "anilist"
      ? `https://anilist.co/anime/${entry.media.id}`
      : `https://myanimelist.net/anime/${entry.media.idMal}`;
  animeLineContent
    .append(
      $(`<div class='top'></div>`)
        .append(
          `<div class='animeTitle' href='${animeLink}' title='Open anime page'>${entry.media.title.userPreferred}</div>`
        )
        .append(badges)
    )
    .append(div_infos);

  $(animeLine).append(animeLineContent);
  if (!line_exist) {
    $("#animesContainer").append(animeLine);
  }
}
function initView() {
  console.log("initView...");
  refresh();
}
function updateCoutDowns() {
  $(".animeCountDown").each(function () {
    let id = $(this).data("id");
    $(this).text(dateToCountDown(extension.get_anime(id).time));
  });
}
function decreaseCountDowns() {
  $(".animeCountDown").each(function () {
    let id = $(this).data("id");
    if (extension.get_anime(id)) {
      if (extension.get_anime(id).time <= 0) {
        refresh();
      } else {
        $(this).text(dateToCountDown(extension.get_anime(id).time));
      }
    }
  });
}
/**
 * Return true if the shown data are deprecated
 * @param {*} newAnimesData
 */
function isOldDataDeprecated(newAnimesData) {
  if (oldAnimesData.length !== newAnimesData.length) {
    return true;
  }
  let diffId = oldAnimesData.filter((d) => newAnimesData.filter((e) => e.id === d.id).length === 0);
  if (diffId.length) {
    return true;
  }
  let res = false;
  oldAnimesData.forEach((d) => {
    if (!res) {
      let isIn = newAnimesData.findIndex((nd) => nd.progress === d.progress && nd.status === d.status) > -1;
      if (!isIn) {
        res = true;
      }
    }
  });
  return res;
}
function refresh() {
  $("#refresh").prop("disabled", true);
  let oldText = "";
  oldText = $("#refresh").text();
  $("#refresh").text("Refreshing...");
  oldAnimesData = extension.get_animes_data();
  $("#animesContainer > *").remove();
  extension.get_animes_sort_by_status().forEach((elem) => {
    draw(elem);
  });
  updateGrayScaleBG();
  $("#refresh").prop("disabled", false);
  $("#refresh").text(oldText);
  $(".dlButton, .animeTitle").on("click", function (e) {
    e.preventDefault();
    extension.openLink($(this).attr("href"));
  });
  let nbAnimeLine = $(".animeLine").length;
  let animGlobalTime = nbAnimeLine > 3 ? 1 : 0.5;
  $(".animeLine").each(function (ind) {
    if (ind % 2) {
      $(this).css({ "animation-name": "animeApparitionReverse" });
    }
    $(this).css({
      "animation-delay": (animGlobalTime / nbAnimeLine) * (ind + 1) + "s",
    });
  });
  if (extension.get_user_options().enable3d) {
    handle3dAnimeLine();
  }
}
function getUserOptionString(key, val) {
  if (key === "episodeBehind") {
    switch (val) {
      case 1:
        return "1 ep. max";
      case 2:
        return "2 ep. max";
      case 3:
        return "3 ep. max";
      case 4:
        return "4 ep. max";
      case 5:
        return "No limit";
    }
  }
  if (key === "animeSub") {
    switch (val) {
      case 1:
        return "Raw";
      case 2:
        return "English";
      case 3:
        return "Français";
      case 4:
        return "Pусский";
      case 5:
        return "Español";
    }
  }
  if (key === "qualityAnime") {
    switch (val) {
      case 1:
        return "Any";
      case 2:
        return "720p";
      case 3:
        return "1080p";
    }
  }
  if (key === "formatAnime") {
    switch (val) {
      case 1:
        return "Any";
      case 2:
        return "MP4";
      case 3:
        return "MKV";
    }
  }
  /*if(key === 'delayRequestData') {
        switch(val) {
            case 1:
                return "1 min.";
            case 2:
                return "5 mins.";
            case 3:
                return "10 mins.";
            case 4:
                return "30 mins.";
        }
    }
    if(key === 'delayRequestDl') {
        switch(val) {
            case 1:
                return "2 mins.";
            case 2:
                return "5 mins.";
            case 3:
                return "10 mins.";
            case 4:
                return "30 mins.";
        }
    }*/
  return "";
}
function drawUserOptions() {
  $("#userOptions > *").remove();
  for (let [key, value] of Object.entries(extension.get_user_options())) {
    if (getUserOptionString(key, value)) {
      $("#userOptions").append(`<div class='optionBadge'>${getUserOptionString(key, value)}</div>`);
    }
  }
}

function updateGrayScaleBG() {
  $(".animeLine.airing").each(function () {
    let a = extension.get_anime($(this).data("id"));
    if (a) {
      let nextEp = a.media.nextAiringEpisode;
      let lastEp = a.media.airingSchedule.nodes.find((e) => e.episode === nextEp.episode - 1);
      if (lastEp) {
        let newValue = scale(nextEp.timeUntilAiring, 0, nextEp.airingAt - lastEp.airingAt, 0, 100);
        $(".bg", $(this)).width(newValue + "%");
      }
    }
  });
}

function showError(errorMsg) {
  if (!$(".error").length || $(".error").text() !== errorMsg) {
    $("#animesContainer > *").remove();
    $(".error").remove();
    $("#animesContainer").append(`<div class='error'>${errorMsg}</div>`);
  }
}

function clearError() {
  $(".error").remove();
}

/**
 * Init function
 */
function init() {
  console.log("Init...");
  // Put a loading screen if we need
  if (extension.viewHaveToBeLoading()) {
    $(".loading").removeClass("hide");
  } else {
    $(".loading").addClass("hide");
  }
  // Clear old intervals
  intervals.forEach((e) => {
    clearInterval(e);
  });
  // Get user infos
  extension.getStorage("user", async (res) => {
    // We have a user
    if (res.user) {
      $("#firstPage").addClass("hide");
      $("#main").addClass("hide");
      // If we're not already initializing the data
      if (!extension.isInit() && extension.isInit() !== "pending") {
        // Initialize the data
        await extension.init();
      } else {
        // Or we get fresh data
        extension.requestData();
      }
      // Fill userName field
      $("#userName").text(res.user.userName);
      $("#userName").on("click", function () {
        if (res.user.type === "anilist") {
          extension.openLink(`https://anilist.co/user/${res.user.userName}/animelist`);
        } else {
          extension.openLink(`https://myanimelist.net/animelist/${res.user.userName}`);
        }
      });
      drawUserOptions();
      // Hide the "login" page
      $("#main").removeClass("hide");
      // Initialize the view
      initView();
      // --- Start the differents async function ---
      intervals.push(
        setInterval(() => {
          // decrese countdowns of the airing animes
          decreaseCountDowns();
        }, 1000)
      );
      intervals.push(
        setInterval(() => {
          // We check if we need to refresh the view because of the data
          if (
            !(extension.viewHaveToBeLoading() || extension.viewHaveToRefresh()) &&
            isOldDataDeprecated(extension.get_animes_data())
          ) {
            refresh();
          }
        }, 5000)
      );
      intervals.push(
        setInterval(() => {
          // We check if we have to refresh the view
          if (extension.viewHaveToRefresh()) {
            drawUserOptions();
            refresh();
            extension.viewHaveRefresh();
          }
        }, 1000)
      );
      // Every minute we update the progress BG
      intervals.push(
        setInterval(() => {
          updateGrayScaleBG();
        }, 60000)
      );
      // Every second we check if we have an error and show it if necessary
      intervals.push(
        setInterval(() => {
          if (extension.viewHaveToShowError()) {
            showError(extension.getErrorMsg());
          } else {
            clearError();
          }
        }, 1000)
      );
      // --- END async func ---
    }
    // We do not have a user
    else {
      // Show the login page
      $("#firstPage").removeClass("hide");
      $("#main").addClass("hide");
      $(".userInfos").addClass("hide");
      $(".choiceContainer").removeClass("hide");
    }
  });
}
function update3dAnimeLine(oLayer) {
  oLayer.css({
    transform: "perspective(120px) translateZ(0) rotateX(" + xAngle + "deg) rotateY(" + yAngle + "deg)",
    transition: "none",
    "-webkit-transition": "none",
  });
  /*oLayer.children().css({
    transform:
      "perspective(525px) translateZ(" +
      z +
      "px) rotateX(" +
      xAngle / 0.66 +
      "deg) rotateY(" +
      yAngle / 0.66 +
      "deg)",
    transition: "none",
    "-webkit-transition": "none",
  });*/
}
function handle3dAnimeLine() {
  $selector = $(".animeLine");
  xAngle = 0;
  yAngle = 0;
  $selector.on("mousemove", function (e) {
    var $this = $(this);
    var xRel = e.pageX - $this.offset().left;
    var yRel = e.pageY - $this.offset().top;
    var width = $this.width();
    var height = $this.height();
    yAngle = -(0.5 - xRel / width) * 5;
    xAngle = (0.5 - yRel / height) * 5;
    /* xAngle = Number.isInteger(xAngle / 2) ? xAngle : xAngle + 1;
    yAngle = Number.isInteger(yAngle / 2) ? yAngle : yAngle + 1;
    console.log({ xAngle, yAngle });*/

    update3dAnimeLine($this.children(".infosContainer"));
  });
  $selector.on("mouseleave", function () {
    oLayer = $(this).children(".infosContainer");
    oLayer.css({
      transform: "perspective(120px) translateZ(0) rotateX(0deg) rotateY(0deg)",
      transition: "all 150ms linear 0s",
      "-webkit-transition": "all 150ms linear 0s",
    });
    /*oLayer.children().css({
      transform: "perspective(525px) translateZ(0) rotateX(0deg) rotateY(0deg)",
      transition: "all 150ms linear 0s",
      "-webkit-transition": "all 150ms linear 0s",
    });*/
  });
}
$(function () {
  init();
  $(".userNameInput").keydown(function (event) {
    if (event.keyCode == 13) {
      $(this).nextAll().eq(0).click();
    }
  });
  $("#changeUser").on("click", function () {
    extension.removeStorage("user", () => {
      extension.clearIntervals();
      extension.clearAnimesData();
      extension.updateBadge();
      init();
    });
  });
  $("#submitUserName").on("click", function () {
    let userName = $("#userName_input").val();
    if (userName.length > 0) {
      extension.saveStorage("user", { userName: userName, type: "anilist" }, () => {
        extension.setInit(false);
        init();
      });
    }
  });
  $("#submitUserNameMAL").on("click", function () {
    let userName = $("#userName_input_mal").val();
    if (userName.length > 0) {
      extension.saveStorage("user", { userName: userName, type: "mal" }, () => {
        extension.setInit(false);
        init();
      });
    }
  });
  $("#refreshAll").on("click", function () {
    extension.setInit(false);
    init();
  });
  $("#refresh").on("click", function () {
    refresh();
  });
  $(".choseAnilist").on("click", function () {
    $(".choiceContainer").addClass("hide");
    $(".userAnilist").removeClass("hide");
  });
  $(".choseMAL").on("click", function () {
    $(".choiceContainer").addClass("hide");
    $(".userMAL").removeClass("hide");
  });
  setInterval(() => {
    if (extension.viewHaveToBeLoading() || extension.viewHaveToRefresh()) {
      $(".loading").removeClass("hide");
      $("#main").addClass("hide");
    } else {
      $(".loading").addClass("hide");
      if ($("#firstPage").hasClass("hide")) {
        $("#main").removeClass("hide");
      }
    }
  }, 100);
});
