//=============================================================================
// AdjustPictureGraphical.js
// ----------------------------------------------------------------------------
// Copyright (c) 2015 Triacontane
// This plugin is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// 원작자 링크
// [Blog]   : http://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc 픽쳐 위치 조정 플러그인
 * @author triacontane
 *
 * @param GridSize
 * @text 그리드 사이즈 
 * @desc 픽쳐 조정 중에 지정 사이즈로 그리드를 표시합니다. 0으로 지정하면 비표시.
 * @default 48
 * @type number
 *
 * @param TestMapId
 * @text 테스트 맵 ID
 * @desc 임의의 맵을 이벤트 테스트 맵으로 설정할 수 있습니다.
 * @default -1
 * @type number
 * @min -1
 *
 * @help 이벤트 커맨드 테스트 시에 픽쳐의 표시 위치를
 * 드래그 & 드롭으로 미세 조정할 수 있습니다.
 * 좌측 상단의 타이틀 바에 선택한 픽쳐의 좌표가 표시되므로
 * 테스트 화면을 표시시키면서 픽쳐의 좌표를 조정해 주세요.
 * 
 * 단, 이벤트 커맨드 테스트 이외에서는 기능하지 않습니다.
 * 이벤트 커맨드 테스트는 이벤트 에디터에서 이벤트 커맨드를
 * 선택하여 우클릭 → 테스트(Ctrl + R)로 실행할 수 있습니다.
 * 
 * 주의!
 * 플러그인 매니저에서 이 플러그인을 유효로 한 후에는
 * 테스트를 하기 전에 "프로젝트 저장"(Ctrl + S)을 실시해 주세요.
 * 
 * 이 플러그인에 플러그인 커맨드는 없습니다.
 * 
 * 이용 규약:
 * 저작자의 허락 없이 개조, 재배포가 가능하고,
 * 이용 형태(상업용, 18금 이용 등)에 대해서도 제한은 없습니다.
 * 이 플러그인은 이미 당신의 것입니다.
 */

(function () {
    'use strict';
    // イベントテスト時以外は一切の機能を無効
    if (!DataManager.isEventTest())return;

    var pluginName = 'AdjustPictureGraphical';

    //=============================================================================
    // ローカル関数
    //  プラグインパラメータやプラグインコマンドパラメータの整形やチェックをします
    //=============================================================================
    var getParamNumber = function(paramNames, min, max) {
        var value = getParamOther(paramNames);
        if (arguments.length < 2) min = -Infinity;
        if (arguments.length < 3) max = Infinity;
        return (parseInt(value, 10) || 0).clamp(min, max);
    };

    var getParamOther = function(paramNames) {
        if (!Array.isArray(paramNames)) paramNames = [paramNames];
        for (var i = 0; i < paramNames.length; i++) {
            var name = PluginManager.parameters(pluginName)[paramNames[i]];
            if (name) return name;
        }
        return null;
    };

    //=============================================================================
    // Input
    //  [c]を追加定義します。
    //=============================================================================
    Input.keyMapper[67] = 'copy';

    //=============================================================================
    // DataManager
    //  テスト用マップの読み込みを追加定義します。
    //=============================================================================
    var _DataManager_setupEventTest = DataManager.setupEventTest;
    DataManager.setupEventTest = function() {
        _DataManager_setupEventTest.call(this);
        var mapId = getParamNumber(['TestMapId'], -1, 9999);
        if (mapId > 0) $gamePlayer.reserveTransfer(mapId, 8, 6);
    };

    //=============================================================================
    // Game_Picture
    //  ピクチャを掴んだ場合に移動を中断します。
    //=============================================================================
    Game_Picture.prototype.resetMove = function(x, y) {
        this._x = x;
        this._y = y;
        this._duration = 0;
    };

    //=============================================================================
    // Game_Screen
    //  最後に選択したピクチャの座標を保存します。
    //=============================================================================
    var _Game_Screen_initialize = Game_Screen.prototype.initialize;
    Game_Screen.prototype.initialize = function() {
        _Game_Screen_initialize.call(this);
        this._lastPictureX = null;
        this._lastPictureY = null;
        this._copyCount    = 0;
        this._infoPicture  = '';
        this._infoHelp     = 'Shift: 윈도우 표시 전환 / Ctrl+마우스: 그리드에 스냅 / Ctrl+C: 좌표 복사';
        this._infoCopy     = '';
        this._documentTitle = '';
    };

    var _Game_Screen_updatePictures = Game_Screen.prototype.updatePictures;
    Game_Screen.prototype.updatePictures = function() {
        _Game_Screen_updatePictures.call(this);
        if (Utils.isNwjs() && Input.isPressed('control') && Input.isTriggered('copy')) {
            if (this._lastPictureX == null || this._lastPictureY == null) return;
            var clipboard = require('nw.gui').Clipboard.get();
            var copyValue = '';
            if (this._copyCount % 2 === 0) {
                copyValue = this._lastPictureX.toString();
                this._infoCopy = ' X좌표 [' + copyValue + ']를 복사했습니다.';
            } else {
                copyValue = this._lastPictureY.toString();
                this._infoCopy = ' Y좌표 [' + copyValue + ']를 복사했습니다.';
            }
            clipboard.set(copyValue, 'text');
            this._copyCount++;
        }
        var docTitle = this._infoHelp + this._infoPicture + this._infoCopy;
        if (docTitle !== this._documentTitle) {
            document.title = docTitle;
            this._documentTitle = docTitle;
        }
    };

    //=============================================================================
    // Scene_Map
    //  テストイベント時の特別な処理
    //=============================================================================
    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        if (!$gameMap.isEventRunning()) this.updateEventTest();
        _Scene_Map_update.call(this);
    };

    Scene_Map.prototype.updateEventTest = function() {
        this._spriteset.checkDragPictures();
        if (Input.isTriggered('shift')) {
            if (!this._messageWindow.isOpen()) {
                this._messageWindow.open();
            } else {
                this._messageWindow.close();
            }
        }
    };

    Scene_Map.prototype.isMapTouchOk = function() {
        return false;
    };

    //=============================================================================
    // Spriteset_Base
    //  配下のピクチャから掴んでいるものを探します。
    //=============================================================================
    Spriteset_Base.prototype.checkDragPictures = function() {
        this._pictureContainer.children.reverse().some(function(picture) {
            return picture.checkDrag && picture.checkDrag();
        }, this);
        this._pictureContainer.children.reverse();
    };

    var _Spriteset_Base_createLowerLayer = Spriteset_Base.prototype.createLowerLayer;
    Spriteset_Base.prototype.createLowerLayer = function() {
        _Spriteset_Base_createLowerLayer.call(this);
        this.createGridSprite();
    };

    Spriteset_Base.prototype.createGridSprite = function() {
        var size = getParamNumber(['GridSize'], 0, Math.max(this.width, this.height));
        if (size === 0) return;
        this._gridSprite = new Sprite();
        this._gridSprite.setFrame(0, 0, this.width, this.height);
        var bitmap = new Bitmap(this.width, this.height);
        for (var x = 0; x < this.width; x += size) {
            bitmap.fillRect(x, 0, 1, this.height, 'rgba(255,255,255,1.0)');
        }
        for (var y = 0; y < this.height; y += size) {
            bitmap.fillRect(0, y, this.width, 1, 'rgba(255,255,255,1.0)');
        }
        this._gridSprite.bitmap = bitmap;
        this.addChild(this._gridSprite);
    };

    //=============================================================================
    // Sprite_Picture
    //  テストイベント時にピクチャを掴みます。
    //=============================================================================
    var _Sprite_Picture_initialize = Sprite_Picture.prototype.initialize;
    Sprite_Picture.prototype.initialize = function(pictureId) {
        _Sprite_Picture_initialize.call(this, pictureId);
        this._holding = false;
        this._dx      = 0;
        this._dy      = 0;
    };

    Sprite_Picture.prototype.checkDrag = function() {
        var picture = this.picture();
        if (picture != null) {
            if (this.updateDragMove()) {
                var result                = 'PictureNum:[' + this._pictureId + '] X:[' + this.x + '] Y:[' + this.y + ']';
                $gameScreen._lastPictureX = this.x;
                $gameScreen._lastPictureY = this.y;
                $gameScreen._infoPicture  = result;
                $gameScreen._infoCopy     = '';
                if (!this._holding) console.log(result);
                picture.resetMove(this.x, this.y);
                return true;
            }
        }
        return false;
    };

    Sprite_Picture.prototype.updateDragMove = function() {
        if (this.isTriggered() || (this._holding && TouchInput.isPressed())) {
            if (!this._holding) this.hold();
            var x = TouchInput.x - this._dx;
            var y = TouchInput.y - this._dy;
            if (Input.isPressed('control')) {
                var size = getParamNumber(['GridSize'], 0, Math.max(this.width, this.height));
                if (size !== 0) {
                    x % size > size / 2 ? x += size - x % size : x -= x % size;
                    y % size > size / 2 ? y += size - y % size : y -= y % size;
                }
            }
            this.move(x, y);
            return true;
        } else if (this._holding) {
            this.release();
            return true;
        }
        return false;
    };

    Sprite_Picture.prototype.hold = function() {
        this._holding = true;
        this._dx      = TouchInput.x - this.x;
        this._dy      = TouchInput.y - this.y;
        this.setBlendColor([255,255,255,192]);
    };

    Sprite_Picture.prototype.release = function() {
        this._holding = false;
        this.setBlendColor([0,0,0,0]);
    };

    //=============================================================================
    // Sprite_Picture
    //  タッチ操作を可能にする共通部分
    //=============================================================================
    Sprite_Picture.prototype.screenWidth = function() {
        return (this.width || 0) * this.scale.x;
    };

    Sprite_Picture.prototype.screenHeight = function() {
        return (this.height || 0) * this.scale.y;
    };

    Sprite_Picture.prototype.screenX = function() {
        return (this.x || 0) - this.anchor.x * this.screenWidth();
    };

    Sprite_Picture.prototype.screenY = function() {
        return (this.y || 0) - this.anchor.y * this.screenHeight();
    };

    Sprite_Picture.prototype.minX = function() {
        var width = this.screenWidth();
        return Math.min(this.screenX(), this.screenX() + width);
    };

    Sprite_Picture.prototype.minY = function() {
        var height = this.screenHeight();
        return Math.min(this.screenY(), this.screenY() + height);
    };

    Sprite_Picture.prototype.maxX = function() {
        var width = this.screenWidth();
        return Math.max(this.screenX(), this.screenX() + width);
    };

    Sprite_Picture.prototype.maxY = function() {
        var height = this.screenHeight();
        return Math.max(this.screenY(), this.screenY() + height);
    };

    Sprite_Picture.prototype.isTouchPosInRect = function () {
        var dx = TouchInput.x - this.x;
        var dy = TouchInput.y - this.y;
        var sin = Math.sin(-this.rotation);
        var cos = Math.cos(-this.rotation);
        var rx = this.x + Math.floor(dx * cos + dy * -sin);
        var ry = this.y + Math.floor(dx * sin + dy * cos);
        return (rx >= this.minX() && rx <= this.maxX() &&
                ry >= this.minY() && ry <= this.maxY());
    };

    Sprite_Picture.prototype.isTouchable = function() {
        return this.bitmap != null && this.visible && this.scale.x !== 0 && this.scale.y !== 0;
    };

    Sprite_Picture.prototype.isTriggered = function() {
        return this.isTouchEvent(TouchInput.isTriggered);
    };

    Sprite_Picture.prototype.isTouchEvent = function(triggerFunc) {
        return this.isTouchable() && triggerFunc.call(TouchInput) && this.isTouchPosInRect();
    };
})();
