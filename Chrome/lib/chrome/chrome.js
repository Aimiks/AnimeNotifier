var ani_query = `
query ($userName: String) { # Define which variables will be used in the query (id)
    MediaListCollection(userName: $userName, type: ANIME, status: CURRENT) {
        lists {
            entries {
                id
                progress
                media {
                    id
                    title {
                        romaji
                        english
                        native
                        userPreferred
                    }
                    synonyms
                    status
                    coverImage {
                        extraLarge
                        large
                        medium
                        color
                    }
                    nextAiringEpisode {
                        timeUntilAiring
                        airingAt
                        episode
                    }
                    airingSchedule {
                  	  nodes {
                        episode
                        airingAt
                  	  }
                  	}
                    episodes
                }
            }
        }
    }
}`;

var mal_ani_query = ` 
query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
                            id
                            title {
                                romaji
                                english
                                native
                                userPreferred
                            }
                            synonyms
                            status
                            coverImage {
                                extraLarge
                                large
                                medium
                                color
                            }
                            nextAiringEpisode {
                                timeUntilAiring
                                airingAt
                                episode
                            }
                            episodes
                          }
                      }`;

var variables = {
    userName: ""
};
var ani_url = 'https://graphql.anilist.co',
    options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: ani_query,
            variables: variables
        })
    };
var mal_ani_variables = {
    idMal: 0
};
var mal_ani_url = 'https://graphql.anilist.co',
    mal_ani_options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: mal_ani_query,
            variables: mal_ani_variables
        })
    };
var animes_data = [];
var intervals = [];
var initialized = false;
var user;
var user_options;
var oldUserOptions = {};
var viewRefresh = false;

function getUserOptionsValue(key) {
    let val = user_options[key];
    if(key === "episodeBehind") {
        switch(val) {
            case 1:
                return 1;
            case 2:
                return 2;
            case 3:
                return 3;
            case 4:
                return 4;
            case 5:
                return null;
        }
    }
    if(key === "animeSub") {
        switch(val) {
            case 1:
                return null;
            case 2:
                return "EN";
            case 3:
                return "VOSTFR";
            case 4:
                return "RUS";
            case 5:
                return "ES";
        }
    }
    if(key === "qualityAnime") {
        switch(val) {
            case 1:
                return null;
            case 2:
                return "720";
            case 3:
                return "1080";
        }
    }
    if(key === "formatAnime") {
        switch(val) {
            case 1:
                return null;
            case 2:
                return "mp4";
            case 3:
                return "mkv";
        }
    }
    if(key === "delayRequestData") {
        switch(val) {
            case 1:
                return 60*1000;
            case 2:
                return 5*60*1000;
            case 3:
                return 10*60*1000;
            case 4:
                return 30*60*1000;
        }
    }
    if(key === "delayRequestDl") {
        switch(val) {
            case 1:
                return 2*60*1000;
            case 2:
                return 5*60*1000;
            case 3:
                return 10*60*1000;
            case 4:
                return 30*60*1000;
        }
    }
    return null;
}

function get_animes_data() {
    return animes_data;
}
function add_anime(obj) {
    let ind = get_animes_data().findIndex(a => a.id === obj.id);
    if (ind === -1) {
        animes_data.push(obj);
    } else {
        for( let key of Object.keys(animes_data[ind])) {
            if(key !== 'media' && key !== 'dl') {
                animes_data[ind][key] = obj[key];
            } 
        }
    }
}
function get_anime(id) {
    return get_animes_data().find(a => a.id === id);
}
function decr_anime_time(id) {
    let ind = animes_data.findIndex(a => a.id === id);
    if (ind === -1) {
    } else {
        animes_data[ind].time -= 1;
    }
}
function add_link_to_anime(id, dl) {
    let a = get_anime(id);
    if (a) {
        if (a.dl) {
            if (a.dl.findIndex(d => d.name === dl.name) === -1) {
                a.dl.push(dl);
            }
        } else {
            a.dl = [dl];
        }
    }
}
function get_animes_sort_by_status() {
    return get_animes_data().sort((a, b) => {
        if (a.status === "UP") {
            if (b.status !== a.status) {
                return -1
            }
        } else {
            if (b.status !== a.status) {
                return 1
            }
        }
        if(a.status === 'UP' && b.status === 'UP') {
            if(a.dl && !b.dl) return -1;
            if(!a.dl  && b.dl) return 1;
            if(a.media.title.userPreferred > b.media.title.userPreferred) return 1; 
            if(a.media.title.userPreferred < b.media.title.userPreferred) return -1; 
        } else {
            if (a.time > b.time) return 1;
            if (a.time < b.time) return -1;
        }

    });
}
async function requestData() {
    console.log("Requesting data...");
    if (user.type === 'anilist') {
        return fetch(ani_url, options).then(handleResponse)
            .then(handleData)
            .catch(handleError);
    } else {
        var mal_query = `https://api.jikan.moe/v3/user/${user.userName}/animelist/watching`;
        return fetch(mal_query)
            .then((response) => response.json())
            .then(async res => {
                if (res.anime) {
                    mals_anime = res.anime;
                    let finalData = {
                        data: {
                            MediaListCollection: {
                                lists: [
                                    {
                                        entries: []
                                    }
                                ]
                            }
                        }
                    };
                    for(const a of mals_anime) {
                        mal_ani_variables.idMal = a.mal_id;
                        mal_ani_options = {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                            },
                            body: JSON.stringify({
                                query: mal_ani_query,
                                variables: mal_ani_variables
                            })
                        };
                        data = await fetch(mal_ani_url, mal_ani_options).then(handleResponse).catch(handleError);
                        finalData.data.MediaListCollection.lists[0].entries.push({id: data.data.Media.id, progress: a.watched_episodes, media: data.data.Media});
                        await new Promise(r => setTimeout(r, mals_anime.length >= 90 ? 666 : 100));
                    };
                    handleData(finalData);
                    console.log(finalData);
                }
            }).catch(handleError);
    }

    function handleResponse(response) {
        return response.json().then(function (json) {
            return response.ok ? json : Promise.reject(json);
        });
    }

    function handleData(data) {
        console.log(data.data);
        entries = data.data.MediaListCollection.lists[0].entries;
        // something has to to be removed
        if (get_animes_data().length > entries.length) {
            animes_data = get_animes_data().filter(d => entries.map(e => e.id).findIndex(d.id) > -1);
        }
        entries.forEach(entry => {
            if(entry.media.nextAiringEpisode === null) {
                if(getUserOptionsValue("episodeBehind")===null || entry.progress >= (entry.media.episodes - getUserOptionsValue("episodeBehind")) ) {
                    let nextEp = entry.media.airingSchedule.nodes.find(n => n.episode === entry.progress + 1)
                    let dateDiff;
                    if (nextEp) {
                        let nextEpAir = new Date(nextEp.airingAt * 1000);
                        dateDiff = (Date.now() - nextEpAir) / (1000 * 3600 * 24);
                    }
                    add_anime({ id: entry.media.id, time: 0, status: 'UP', progress: entry.progress, behind: entry.media.episodes - entry.progress, new: dateDiff && dateDiff < 7, media: entry.media });
                }
            } else if(entry.progress === (entry.media.nextAiringEpisode.episode - 1)) {
                var diff = entry.media.nextAiringEpisode.timeUntilAiring;
                add_anime({ id: entry.media.id, time: diff, status: 'AIRING', progress: entry.progress, media: entry.media });
            } else if(getUserOptionsValue("episodeBehind")===null || entry.progress >= ( (entry.media.nextAiringEpisode.episode -1) - getUserOptionsValue("episodeBehind"))) {
                add_anime({ id: entry.media.id, time: 0, status: 'UP', progress: entry.progress, behind: (entry.media.nextAiringEpisode.episode - 1) - entry.progress, new: entry.progress === (entry.media.nextAiringEpisode.episode - 2), media: entry.media });
            }
            /*let nextEp = entry.media.airingSchedule.nodes.find(n => n.episode === entry.progress + 1)
            let dateDiff;
            if (nextEp) {
                let nextEpAir = new Date(nextEp.airingAt * 1000);
                dateDiff = (Date.now() - nextEpAir) / (1000 * 3600 * 24);
                    if (dateDiff && dateDiff > 0 && (getUserOptionsValue()===null || dateDiff < (7 * getUserOptionsValue("episodeBehind")))) {
                        add_anime({ id: entry.media.id, time: 0, status: 'UP', progress: entry.progress, media: entry.media });
                    }
            }
            if (entry.media.nextAiringEpisode && entry.progress === (entry.media.nextAiringEpisode.episode - 1)) {
            }*/
        });
        updateBadge();
        return entries;
    }

    function handleError(error) {
        console.error(error);
        return null;
    }
}

async function searchDlLinks(title, ep, lang, quality, format) {
    console.log(`Searching links... ${title},${ep},${lang},${quality},${format}`);
    let query = title.replace(/\s/gmi,"+");
    let category = '1_0';
    let opt = {
        method: 'GET'
    }
    if(lang === null) {
        category= '1_4';
        lang = '';
    }
    if(lang === 'EN') {
        category= '1_2';
        lang = '';
    }
    query += '+' + ep;

    if(lang && lang.length) {
        query += '+' + lang;
    } else {
    }
    if(quality) {
        query+='+' + quality;
    }
    if(format)  {
        query+='+' + format;
    }
    console.log(`Query : https://nyaa.si/?f=1&c=${category}&q=${query}&p=1&o=desc&s=seeders`);
    return fetch(`https://nyaa.si/?f=1&c=${category}&q=${query}&p=1&o=desc&s=seeders`, opt)
        .then(response => response.text())
        .then(txt => {
            let html = txt;
            let tr = $(html).find("table:first-child tbody tr:first-child");
            let name = $(tr).find("td:nth-child(2) a:not(.comments)").text();
            let magnet = $(tr).find("td:nth-child(3) a:nth-child(2)").attr("href");
            return { name: name, magnet: magnet };
        }).catch(e => {
            console.error(e);
            return null
        });
}

async function getDlLinks(a) {
    let dl = await searchDlLinks(a.media.title.userPreferred, (a.progress + 1), getUserOptionsValue("animeSub"), getUserOptionsValue("qualityAnime"), getUserOptionsValue("formatAnime"));
    if (!dl || !dl.magnet) {
        let secTitle;
        if (a.media.title.userPreferred === a.media.title.romaji && a.media.title.english) {
            secTitle = a.media.title.english;
        } else {
            secTitle = a.media.title.romaji;
        }
        await new Promise(r => setTimeout(r, 500));
        dl = await searchDlLinks(secTitle, (a.progress + 1), getUserOptionsValue("animeSub"), getUserOptionsValue("qualityAnime"), getUserOptionsValue("formatAnime"));
        if ((!dl || !dl.magnet) && a.media.synonyms.length) {
            let i = 0;
            while ((!dl || !dl.magnet) && a.media.synonyms.length - 1 < i) {
                await new Promise(r => setTimeout(r, 500));
                dl = await searchDlLinks(a.media.synonyms[i], (a.progress + 1), getUserOptionsValue("animeSub"), getUserOptionsValue("qualityAnime"), getUserOptionsValue("formatAnime"));
                i++;
            }
        }
    }
    if (dl && dl.magnet) {
        add_link_to_anime(a.id, dl);
        updateBadge();
    }
    return false;
}
async function loadDataFromStorage() {
    await new Promise(function (resolve, reject) {
        getStorage('user', (storage) => {
            user = storage.user;
            if (user.type === 'anilist') {
                variables.userName = user.userName;
                options = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        query: ani_query,
                        variables: variables
                    })
                };
            } else {
                mal_ani_variables.userName = user.userName;
                mal_ani_options = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        query: mal_ani_query,
                        variables: mal_ani_variables
                    })
                };
            }
            resolve();
        });
    });
    return new Promise(function (resolve, reject) { 
        chrome.storage.sync.get({
            episodeBehind: 1,
            qualityAnime: 3,
            formatAnime:3,
            dlNumber:1,
            delayRequestData:2,
            delayRequestDl:3,
            animeSub:3
        }, function(items) {
            for (let [key, value] of Object.entries(items)) {
                items[key] = value * 1;
            }
            user_options = items;
            resolve();
        });
    });
}
async function init() {
    intervals.forEach(e => {
        clearInterval(e);
    });
    animes_data = [];
    await loadDataFromStorage();
    oldUserOptions = user_options;
    console.log(JSON.parse(JSON.stringify(user_options)));
    await requestData();
    intervals.push(setInterval( () => {
        for (const a of get_animes_data().filter(a => a.status === 'AIRING')) {
            decr_anime_time(a.id);
        }    
    }, 1000));
    for (const a of get_animes_data().filter(a => a.status === 'UP')) {
        await new Promise(r => setTimeout(r, 500));
        await getDlLinks(a);
    }
    initialized = true;
    intervals.push(setInterval(() => {
        requestData();
    },getUserOptionsValue("delayRequestData")));
    intervals.push(setInterval(async () => {
        for (const a of get_animes_data().filter(a => a.status === 'UP')) {
            await new Promise(r => setTimeout(r, 500));
            await getDlLinks(a);
        }
    }, getUserOptionsValue("delayRequestDl")));
    intervals.push(setInterval( () => {
        loadDataFromStorage();
    }, 1000))
    intervals.push(setInterval( async ()=> {
        if(userOptionsChanged()) {
            for (const a of get_animes_data().filter(a => a.status === 'UP')) {
                delete a.dl;
                await new Promise(r => setTimeout(r, 500));
                await getDlLinks(a);
            }
            viewRefresh = true;
            gettingNewLinks = false;
        }
    }, 1000));

}

function saveStorage(key, val, cb) {
    if (!cb) {
        cb = function () { };
    }
    chrome.storage.sync.set({ [key]: val }, cb);
}
function getStorage(key, cb) {
    if (!cb) {
        cb = function () { };
    }
    chrome.storage.sync.get(key, cb);
}
function clearStorage(cb) {
    if (!cb) {
        cb = function () { };
    }
    chrome.storage.sync.clear(cb)
}
function removeStorage(key,cb) {
    if (!cb) {
        cb = function () { };
    }
    chrome.storage.sync.remove(key, cb);
}
function setBadge(text, color, cb) {
    if (!cb) {
        cb = function () { };
    }
    if (color) {
        chrome.browserAction.setBadgeBackgroundColor({ color: color }, cb);
    }
    chrome.browserAction.setBadgeText({ text: text }, cb);
}

function isInit() {
    return initialized;
}
function setInit(bool) {
    initialized = bool;
}
function openLink(link) {
    chrome.tabs.create({ url: link });
}
function updateBadge() {
    let color;
    let nbTotal = get_animes_data().filter(a => a.status === 'UP').length;
    let nbTotalDl = get_animes_data().filter(a => a.status === 'UP' && a.dl && a.dl.length > 0).length;
    if (nbTotalDl < nbTotal * .25) {
        color = "#db1414";
    } else if (nbTotalDl > nbTotal * .25 && nbTotalDl < nbTotal * .5) {
        color = "#c4640a";
    }
    else {
        color = "#3ea345";
    }
    setBadge("" + nbTotal, color);
}

function get_user_options() {
    return user_options;
}

function userOptionsChanged() {
    let val = JSON.stringify(oldUserOptions) === JSON.stringify(get_user_options());
    oldUserOptions = user_options;
    return !val;
}

function viewHaveToRefresh() {
    return viewRefresh;
}
function viewHaveRefresh() {
    viewRefresh = false;
}

function clearIntervals() {
    intervals.forEach(e => {
        clearInterval(e);
    });
}

