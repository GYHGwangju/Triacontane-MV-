//=============================================================================
// SaveFileLoadOnly.js
// ----------------------------------------------------------------------------
// Copyright (c) 2015-2017 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.0.0 2017/08/09 初版
// ----------------------------------------------------------------------------
// [Blog]   : https://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc 세이브 파일의 로드 전용 설정 플러그인
 * @author Triacontane
 *
 * @param Load_Only_Condition
 * @desc 로드 전용으로 설정할 파일의 조건식입니다.
 * \v[n]의 제어 문자로 변수 값을 참조할 수 있습니다.
 * @default fileId === 1
 *
 * @param Load_Only_Icon_Id
 * @desc 세이브 화면에서 로드 전용 파일에만 표시할 아이콘의
 * ID 입니다.
 * @default 195
 * @type number
 *
 * @help SaveFileLoadOnly.js
 * 번역: 시낵스
 *
 * 특정 세이브 파일을 로드 전용으로 설정할 수 있습니다.
 * 파라미터에서 로드 전용 조건을 지정할 수 있으며,
 * 조건에는 계산식을 사용할 수 있습니다.
 * 예시：
 * fileId === 1               # 파일 1을 로드 전용으로 설정합니다.
 * fileId === \v[1]           # 1번 변수의 값이 파일 ID인 파일을 
 *                              로드 전용으로 설정합니다.
 * fileId >= 1 && fileId <= 3 # 파일 ID가 1에서 3 사이인 파일을 
 *                              로드 전용으로 설정합니다.
 *
 * 이 플러그인에는 플러그인 커맨드는 없습니다.
 *
 * 이용약관:
 *  작자의 무단으로 변경 및 재배포가 가능하며, 
 *  이용 형태(상업적, 18금 이용 등)에 대해서도 제한은 없습니다.
 *  이 플러그인은 이미 당신의 것입니다.
 */

(function() {
    'use strict';
    var pluginName = 'SaveFileLoadOnly';

    //=============================================================================
    // ローカル関数
    //  プラグインパラメータやプラグインコマンドパラメータの整形やチェックをします
    //=============================================================================
    var getParamString = function(paramNames) {
        if (!Array.isArray(paramNames)) paramNames = [paramNames];
        for (var i = 0; i < paramNames.length; i++) {
            var name = PluginManager.parameters(pluginName)[paramNames[i]];
            if (name) return name;
        }
        return '';
    };

    var getParamNumber = function(paramNames, min, max) {
        var value = getParamString(paramNames);
        if (arguments.length < 2) min = -Infinity;
        if (arguments.length < 3) max = Infinity;
        return (parseInt(value) || 0).clamp(min, max);
    };

    var convertEscapeCharacters = function(text) {
        if (isNotAString(text)) text = '';
        var windowLayer = SceneManager._scene._windowLayer;
        return windowLayer ? windowLayer.children[0].convertEscapeCharacters(text) : text;
    };

    var isNotAString = function(args) {
        return String(args) !== args;
    };

    //=============================================================================
    // パラメータの取得と整形
    //=============================================================================
    var param               = {};
    param.conditionRoadOnly = getParamString(['Load_Only_Condition']);
    param.roadOnlyIconId    = getParamNumber(['Load_Only_Icon_Id'], 0);

    //=============================================================================
    // Window_SavefileList
    //  ロード専用ファイルの判定を追加定義します。
    //=============================================================================
    var _Window_SavefileList_isCurrentItemEnabled      = Window_SavefileList.prototype.isCurrentItemEnabled;
    Window_SavefileList.prototype.isCurrentItemEnabled = function() {
        return _Window_SavefileList_isCurrentItemEnabled.apply(this, arguments) && !this.isCurrentItemLoadOnly();
    };

    Window_SavefileList.prototype.isCurrentItemLoadOnly = function() {
        return this.isModeSave() && this.isLoadOnly(this._index + 1);
    };

    Window_SavefileList.prototype.isLoadOnly = function(fileId) {
        var conditionFormula = convertEscapeCharacters(param.conditionRoadOnly);
        var result;
        try {
            result = !!eval(conditionFormula);
        } catch (e) {
            console.error(e.toString());
            throw new Error('Failed To Execute Script :' + conditionFormula);
        }
        return result;
    };

    var _Window_SavefileList_drawFileId      = Window_SavefileList.prototype.drawFileId;
    Window_SavefileList.prototype.drawFileId = function(id, x, y) {
        _Window_SavefileList_drawFileId.apply(this, arguments);
        if (this.isLoadOnly(id) && param.roadOnlyIconId > 0) {
            this.drawIcon(param.roadOnlyIconId, x + 188 - Window_Base._iconWidth, y + 2);
        }
    };

    Window_SavefileList.prototype.isModeSave = function() {
        return this._mode === 'save';
    };
})();
