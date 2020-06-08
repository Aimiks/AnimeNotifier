var extension = chrome.extension.getBackgroundPage();
var intervals = [];
var oldAnimesData = [];

const scale = (num, in_min, in_max, out_min, out_max) => {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function dateToCountDown(sec) {
    var d = Math.floor(sec / (3600 * 24));
    var h = Math.floor( (sec / (3600)) % 24);
    var m = Math.floor( (sec / (60)) % 60);
    var s =Math.round( (sec % 60));
    if(d < 10) {
        d = "0"+d;
    }
    if(h <10) {
        h = "0"+h;
    }
    if(m<10) {
        m = "0"+m;
    }
    if(s<10) {
        s = "0"+s;
    }
    return `${d}d ${h}h ${m}m ${s}s`;
}

function draw(entry) {
    let div_infos = "";
    let animeLine = $(`.animeLine[data-id=${entry.id}]`);
    let line_exist = animeLine.length !== 0;
    $(`.animeLine[data-id=${entry.media.id}] > *`).remove();
    if(!line_exist) {
        animeLine = $(`<div data-id=${entry.media.id} class='animeLine ${entry.status === "AIRING" ? "airing" : "up"} ${(entry.dl && entry.dl.length) ? 'withDl' : ''}'></div>`);
    }
    let nextEp = entry.media.nextAiringEpisode ? entry.media.nextAiringEpisode.episode : entry.progress+1;
    if(entry.status === 'AIRING') {
        var diff = entry.time;
        var dateAiringString = dateToCountDown(diff);
        div_infos = `<div data-id=${entry.media.id} class='animeCountDown'>${dateAiringString}</div>`;
    } else if(entry.status === "UP") {
        nextEp = entry.progress+1;
        if(entry.dl && entry.dl.length) {
            div_infos = `<div data-id=${entry.media.id} class='animeIsUpWithDl'>`;
            entry.dl.forEach((dl,ind) => {
                // maximum is 3 atm
                if(ind<=2) {
                    div_infos += `<div class='downloadInteractionContainer'>`;
                    var notStrictClass = dl.strict ? '' : 'notStrict ';
                    var title = dl.strict ? dl.name : `Result isn't strict. This can lead to an anime with a similar name.\nPlease verify the name before downloading.\n\n${dl.name}`;
                    div_infos += `<a class='dlButton dlMagnet ${notStrictClass}' href="${dl.magnet}" title="Magnet download\n--\n${title}">${svgMagnet}</a>`;
                    div_infos += `<a class='dlButton dlLink ${notStrictClass}' href="${dl.dlLink}" title="Direct download\n--\n${title}">${svgDl}</a>`;
                    div_infos += `<a class='dlButton dlPage' href="${dl.mainPage}" title="Go to download page\n--\n${title}">${svgPage}</a>`;
                    div_infos += `<div class='ratio'>
                        <span title="Ratio up" class="upRatio">${dl.up}</span><span title="Ratio down" class="downRatio">${dl.down}</span>
                    </div>`; 

                    div_infos += `</div'>`;
                }

            });
            div_infos += '</div>';
        } else {
            div_infos = `<div data-id=${entry.media.id} class='animeIsUp'>Episode up<br>Searching links... </div>`;
        }
    }
    let badges = $(`<div class='badges'></div>`).append(`<div class='epNumber'>${nextEp}</div>`);
    if(entry.new) {
        badges.append($(`<div class='new'>New</div>`));
    } else if(entry.behind) {
        badges.append($(`<div class='behind'>${entry.behind} ep. behind</div>`));
    }
    $(animeLine)
    .append($(`<div class='infosContainer' style='background-image:url(${entry.media.coverImage.extraLarge})'></div>`)
        .append("<div class='blurBg'></div>")
        .append(`<div class='bgContainer'>
            <div class='bg glitch glitch--style-1'>
                <div class="glitch__img"></div>
                <div class="glitch__img"></div>
                <div class="glitch__img"></div>
                <div class="glitch__img"></div>
                <div class="glitch__img"></div>
            </div>
        </div>`)
        .append($(`<div class='top'></div>`)
            .append(`<div class='animeTitle'>${entry.media.title.userPreferred}</div>`)
            .append(badges)
        )
        .append(div_infos) 
    );
    if(!line_exist) {
        $("#animesContainer").append(animeLine);
    }
}
function initAnimes() {
    console.log("InitAnimes...");
    refresh();
}
function updateCoutDowns() {
    $(".animeCountDown").each(function() {
        let id = $(this).data('id');
        $(this).text(dateToCountDown(extension.get_anime(id).time));
    });
}
function decreaseCountDowns() {
    $(".animeCountDown").each(function() {
        let id = $(this).data('id');
        if(extension.get_anime(id)) {
            if(extension.get_anime(id).time <= 0) {
                refresh();
            } else {
                $(this).text(dateToCountDown(extension.get_anime(id).time));
            }
        }
    });
}
function isOldDataDeprecated(newAnimesData) {
    if(oldAnimesData.length !== newAnimesData.length) {
        return true;
    }
    let diffId = oldAnimesData.filter( d => newAnimesData.filter(e => e.id === d.id).length === 0);
    if(diffId.length) {
        return true;
    }
    let res = false;
    oldAnimesData.forEach(d => {
        if(!res) {
            let isIn = newAnimesData.findIndex( (nd) => nd.progress === d.progress && nd.status === d.status)>-1
            if(!isIn) {
                res = true;
            }
        }
    });
    return res;
}
function refresh() {
    $("#refresh").prop("disabled",true);
    let oldText = "";
    oldText = $("#refresh").text();
    $("#refresh").text('Refreshing...');
    oldAnimesData = extension.get_animes_data();
    $("#animesContainer > *").remove();
    extension.get_animes_sort_by_status().forEach( elem => {
        draw(elem);
    });
    updateGrayScaleBG();
    $("#refresh").prop("disabled",false);
    $("#refresh").text(oldText);
    $(".dlButton").on('click',function() {
        extension.openLink($(this).attr("href"));
    });
}
function getUserOptionString(key, val) {
    if(key === 'episodeBehind') {
        switch(val) {
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
    if(key === 'animeSub') {
        switch(val) {
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
    if(key === 'qualityAnime') {
        switch(val) {
            case 1:
                return "Any";
            case 2:
                return "720p";
            case 3:
                return "1080p";
        }
    }
    if(key === 'formatAnime') {
        switch(val) {
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
    return '';
}
function drawUserOptions() {
    $("#userOptions > *").remove();
    for (let [key, value] of Object.entries(extension.get_user_options())) {
        if(getUserOptionString(key,value)) {
            $("#userOptions").append(`<div class='optionBadge'>${getUserOptionString(key,value)}</div>`);
        }
    };
}

function updateGrayScaleBG() {
    $(".animeLine.airing").each(function() {
        let a = extension.get_anime($(this).data("id"));
        if(a) {
            let nextEp = a.media.nextAiringEpisode;
            let lastEp = a.media.airingSchedule.nodes.find(e => e.episode === (nextEp.episode - 1));
            if(lastEp) {
                let newValue = scale(nextEp.timeUntilAiring, 0, nextEp.airingAt - lastEp.airingAt, 0, 100);
                $(".bg",$(this)).width(newValue + "%");
            }
        }
    });
}

function showError(errorMsg) {
    if(!$(".error").length || $(".error").text() !== errorMsg) {
        $("#animesContainer > *").remove();
        $(".error").remove();
        $("#animesContainer").append(`<div class='error'>${errorMsg}</div>`);
    }

}

function clearError() {
    $(".error").remove();
}

function init() {
    console.log("Init...");
    if(extension.viewHaveToBeLoading()) {
        $(".loading").removeClass("hide");
    } else {
        $(".loading").addClass("hide");
    }
    intervals.forEach( e => {
        clearInterval(e);
    });
    extension.getStorage('user', async (res)=> {
        if(res.user) {
            $("#firstPage").addClass("hide");
            $("#main").addClass("hide");
            if(!extension.isInit() && extension.isInit() !== 'pending') {
                await extension.init();
            } else {
                extension.requestData();
            }
            $("#userName").text(res.user.userName);
            drawUserOptions();
            $("#main").removeClass("hide");
            initAnimes();
            intervals.push(setInterval( ()=> {
                decreaseCountDowns();
            }, 1000));
            intervals.push(setInterval( ()=> {
                if(!(extension.viewHaveToBeLoading() || extension.viewHaveToRefresh()) && isOldDataDeprecated(extension.get_animes_data())) {
                    refresh();
                }
            }, 5000));
            intervals.push(setInterval( () => {
                if(extension.viewHaveToRefresh()) {
                    drawUserOptions();
                    refresh();
                    extension.viewHaveRefresh();
                }
            },1000));
            intervals.push(setInterval( () => {
                updateGrayScaleBG();
            }, 60000));
            intervals.push(setInterval( () => {
                 if(extension.viewHaveToShowError()) {
                    showError(extension.getErrorMsg());
                } else {
                    clearError();
                }
            }, 1000));
            
        } else {
            $("#firstPage").removeClass("hide");
            $("#main").addClass("hide");
            $(".userInfos").addClass("hide");
            $(".choiceContainer").removeClass("hide");
        }
    });
}
$(function() {
    init();
    $(".userNameInput").keydown( function(event) {
        if (event.keyCode==13) {
            $(this).nextAll().eq(0).click();
        }
    });
    $("#changeUser").on('click',function() {
        extension.removeStorage('user',() =>  {
            extension.clearIntervals();
            extension.clearAnimesData();
            extension.updateBadge();
            init();
        });
    });
    $("#submitUserName").on('click',function() {
        let userName = $("#userName_input").val();
        if(userName.length > 0) {
            extension.saveStorage('user', {userName:userName, type:'anilist'}, () => {
                extension.setInit(false);
                init();
            });
        }
    });
    $("#submitUserNameMAL").on('click',function() {
        let userName = $("#userName_input_mal").val();
        if(userName.length > 0) {
            extension.saveStorage('user', {userName:userName, type:'mal'}, () => {
                extension.setInit(false);
                init();
            });
        }
    });
    $("#refreshAll").on('click',function() {
        extension.setInit(false);
        init();
    });
    $("#refresh").on('click',function() {
        refresh();
    });
    $(".choseAnilist").on('click',function() {
        $(".choiceContainer").addClass("hide");
        $(".userAnilist").removeClass("hide");
    });
    $(".choseMAL").on('click',function() {
        $(".choiceContainer").addClass("hide");
        $(".userMAL").removeClass("hide");
    });
    setInterval(() => {
        if(extension.viewHaveToBeLoading() || extension.viewHaveToRefresh()) {
            $(".loading").removeClass("hide");
            $("#main").addClass("hide");
        } else {
            $(".loading").addClass("hide");
            if($("#firstPage").hasClass("hide")) {
                $("#main").removeClass("hide");
            }
        }
    },100)
});