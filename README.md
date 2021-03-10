# Clappr Level Selector Plugin

<img src="https://raw.githubusercontent.com/lucasmundim/clappr-level-selector-plugin/master/screenshot.png"/>

## One-off fork

I forked this to fix issues and make it work better with Clappr 0.4.x.  I'm not putting this into npm.  I don't want to become a plugin maintainer.

## Usage

Extract the src folder into your modern javascript project that is built with webpack, and import it along with Clappr 0.4.x.

```javascript
import Clappr from '@clappr/player';
import LevelSelectorPlugin from 'clappr-level-selector-plugin/main.js';
```

(the `dist` folder should contain a pre-compiled release if you aren't using webpack or similar to build your scripts)

Then just add `LevelSelector` into the list of plugins of your player instance:

```javascript
var player = new Clappr.Player({
  source: "http://your.video/here.m3u8",
  plugins: [LevelSelector]
});
```

You can customize the options by following this example:

```javascript
var player = new Clappr.Player({
  source: "http://your.video/here.m3u8",
  plugins: [LevelSelector],
  levelSelectorConfig: {
    assumeLevelChangesWillWork: true,
    title: 'Quality',
    labels: {
        2: 'High', // 500kbps
        1: 'Med', // 240kbps
        0: 'Low', // 120kbps
    },
    labelCallback: function(playbackLevel, customLabel) {
        return customLabel + playbackLevel.level.height+'p'; // High 720p
    }
  }
});
```

Notably, the `assumeLevelChangesWillWork` option is my own addition to work around an issue where clappr's hlsjs playback was not triggering `PLAYBACK_LEVEL_SWITCH_END` when changing levels to or from "AUTO" in such a way that the actual effectiev level did not change.  Setting `assumeLevelChangesWillWork: true` will disable the red flashing state of the level selector button and cause the GUI state to update properly.

You can also transform available levels:

```javascript
var player = new Clappr.Player({
  // [...]
  levelSelectorConfig: {
    onLevelsAvailable: function(levels) {
      return levels.reverse(); // For example, reverse levels order
    },
  },
});
```

## Building

Get node.js. I have v12.14.1.

In a command prompt at the root of the project, you need to download all the referenced packages, so run

```
npm install
```

Then to build, run 

```
npm run build
```

or

```
npm run release
```

## Compatibility

All the playbacks that follow these rules:

* must trigger `PLAYBACK_LEVELS_AVAILABLE` with an ordered array of levels `[{id: 3, label: '500Kbps'}, {id: 4, label: '600Kpbs'}]`
* to have a property `levels`, initialized with `[]` and then after filled with the proper levels
* to have a property `currentLevel` (set/get), the level switch will happen when id (currentLevel) is changed  (`playback.currentLevel = id`)
* optionally, trigger events: `PLAYBACK_LEVEL_SWITCH_START` and `PLAYBACK_LEVEL_SWITCH_END`
* `id=-1` will be always the `Auto` level
