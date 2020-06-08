function saveOptions() {
    let options = {
        episodeBehind : $("#episodeBehind").val(),
        animeSub : $("#animeSub").val(),
        qualityAnime : $("#qualityAnime").val(),
        formatAnime : $("#formatAnime").val(),
        dlNumber : $("#dlNumber").val(),
        delayRequestData : $("#delayRequestData").val(),
        delayRequestDl : $("#delayRequestDl").val()
    };
    chrome.storage.sync.set(options,function() {
        $("#status").text("Saved !");
        setTimeout( () => {$("#status").text("")}, 1500);
    });
}
function restoreOptions() {
    chrome.storage.sync.get({
        episodeBehind: 1,
        qualityAnime: 3,
        formatAnime:1,
        dlNumber:1,
        delayRequestData:2,
        delayRequestDl:3,
        animeSub:3
    }, function(items) {
        $("#episodeBehind").val(items.episodeBehind);
        $("#qualityAnime").val(items.qualityAnime);
        $("#formatAnime").val(items.formatAnime);
        $("#dlNumber").val(items.dlNumber);
        $("#delayRequestData").val(items.delayRequestData);
        $("#delayRequestDl").val(items.delayRequestDl);
        $("#animeSub").val(items.animeSub);
    });
}

$(function() {
    restoreOptions();
    $("#saveOptions").click(saveOptions);
});