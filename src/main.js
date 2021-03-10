import { Events, Styler, UICorePlugin, template } from '@clappr/player';
import pluginHtml from './public/level-selector.html';
import pluginStyle from './public/style.scss';

const AUTO = -1;

export default class LevelSelector extends UICorePlugin
{
	/**
	 * Clappr 0.4.x wants to know what versions this plugin is targeting.
	 */
	get supportedVersion()
	{
		return { min: '0.4.0', max: '0.5.0' };
	}

	get assumeLevelChangesWillWork()
	{
		return this.core.options.levelSelectorConfig && this.core.options.levelSelectorConfig.assumeLevelChangesWillWork;
	}

	static get version()
	{
		return "0.4.3.0";
	}

	get name()
	{
		return 'level_selector';
	}
	get template()
	{
		return template(pluginHtml);
	}

	get attributes()
	{
		return {
			'class': this.name,
			'data-level-selector': ''
		};
	}

	get events()
	{
		return {
			'click [data-level-selector-select]': 'onLevelSelect',
			'click [data-level-selector-button]': 'onShowLevelSelectMenu'
		};
	}

	get container()
	{
		return this.core.activeContainer
			? this.core.activeContainer
			: this.core.mediaControl.container;
	}

	get playback()
	{
		return this.core.activePlayback
			? this.core.activePlayback
			: this.core.getCurrentPlayback();
	}

	bindEvents()
	{
		this.listenTo(this.core, Events.CORE_READY, this.bindPlaybackEvents);
		if (Events.CORE_ACTIVE_CONTAINER_CHANGED)
			this.listenTo(this.core, Events.CORE_ACTIVE_CONTAINER_CHANGED, this.reload);
		else
			this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_CONTAINERCHANGED, this.reload);
		this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_RENDERED, this.render);
		this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_HIDE, this.hideSelectLevelMenu);
	}

	bindPlaybackEvents()
	{
		if (!this.playback)
			return;

		this.listenTo(this.playback, Events.PLAYBACK_LEVELS_AVAILABLE, this.fillLevels);
		this.listenTo(this.playback, Events.PLAYBACK_LEVEL_SWITCH_START, this.startLevelSwitch);
		this.listenTo(this.playback, Events.PLAYBACK_LEVEL_SWITCH_END, this.stopLevelSwitch);
		this.listenTo(this.playback, Events.PLAYBACK_BITRATE, this.activeLevelChanged);

		let playbackLevelsAvailableWasTriggered = this.playback.levels && this.playback.levels.length > 0;
		playbackLevelsAvailableWasTriggered && this.fillLevels(this.playback.levels);
	}

	reload()
	{
		this.stopListening();
		// Ensure it stop listening before rebind events (avoid duplicate events)
		process.nextTick(() =>
		{
			this.bindEvents();
			this.bindPlaybackEvents();
		});
	}

	shouldRender()
	{
		if (!this.container || !this.playback)
			return false;

		let respondsToCurrentLevel = this.playback.currentLevel !== undefined;
		// Only care if we have at least 2 to choose from
		let hasLevels = !!(this.levels && this.levels.length > 1);

		return respondsToCurrentLevel && hasLevels;
	}

	render()
	{
		if (this.shouldRender())
		{
			let style = Styler.getStyleFor(pluginStyle, { baseUrl: this.core.options.baseUrl });

			this.$el.html(this.template({ 'levels': this.levels, 'title': this.getTitle() }));
			this.$el.append(style);
			this.core.mediaControl.$('.media-control-right-panel').append(this.el);
			this.$('.level_selector ul').css('max-height', this.core.el.offsetHeight * 0.8);
			this.updateGUI();
		}
		return this;
	}

	fillLevels(levels, initialLevel = AUTO)
	{
		if (this.selectedLevelId === undefined)
			this.selectedLevelId = initialLevel;

		let onLevelsAvailable = this.core.options && this.core.options.levelSelectorConfig && this.core.options.levelSelectorConfig.onLevelsAvailable;
		if (onLevelsAvailable)
		{
			if (typeof onLevelsAvailable === 'function')
				levels = onLevelsAvailable(levels.slice());
			else
				throw new TypeError('onLevelsAvailable must be a function');
		}

		this.levels = levels;
		this.configureLevelsLabels();
		this.render();
	}

	configureLevelsLabels()
	{
		if (this.core.options.levelSelectorConfig === undefined)
			return;

		let labelCallback = this.core.options.levelSelectorConfig.labelCallback;
		if (labelCallback && typeof labelCallback !== 'function')
			throw new TypeError('labelCallback must be a function');

		let hasLabels = this.core.options.levelSelectorConfig.labels;
		let labels = hasLabels ? this.core.options.levelSelectorConfig.labels : {};

		if (labelCallback || hasLabels)
		{
			let level;
			let label;
			for (let levelId in this.levels)
			{
				level = this.levels[levelId];
				label = labels[level.id];
				if (labelCallback)
					level.label = labelCallback(level, label);
				else if (label)
					level.label = label;

			}
		}
	}

	findLevelBy(id)
	{
		let foundLevel;
		this.levels.forEach((level) => { if (level.id === id) foundLevel = level; });
		return foundLevel;
	}

	onLevelSelect(event)
	{
		window.playback = this.playback;
		this.selectedLevelId = parseInt(event.target.dataset.levelSelectorSelect, 10);
		if (this.playback.currentLevel === this.selectedLevelId)
			return false;

		if (this.assumeLevelChangesWillWork)
			this.updateGUI();

		this.playback.currentLevel = this.selectedLevelId;

		this.toggleContextMenu();

		event.stopPropagation();
		return false;
	}

	onShowLevelSelectMenu()
	{
		this.toggleContextMenu();
	}

	hideSelectLevelMenu()
	{
		this.$('.level_selector ul').hide();
	}

	toggleContextMenu()
	{
		this.$('.level_selector ul').toggle();
	}

	buttonElement()
	{
		return this.$('.level_selector button');
	}

	levelElement(id)
	{
		return this.$('.level_selector ul a' + (!isNaN(id) ? '[data-level-selector-select="' + id + '"]' : '')).parent();
	}

	getTitle()
	{
		return (this.core.options.levelSelectorConfig || {}).title;
	}

	startLevelSwitch()
	{
		if (!this.assumeLevelChangesWillWork)
			this.buttonElement().addClass('changing');
	}

	stopLevelSwitch()
	{
		if (!this.assumeLevelChangesWillWork)
			this.buttonElement().removeClass('changing');
	}

	updateText(level)
	{
		if (level === AUTO)
			this.buttonElement().text(this.activeLevel ? 'AUTO (' + this.activeLevel.label + ')' : 'AUTO');
		else
			this.buttonElement().text(this.findLevelBy(level).label);
	}

	/**
	 * Called when the playback engine changes the active playback level. Only true playback levels exist. The "AUTO" abstraction is not one of them.
	 * @param {Object} info object containing a "level" field that is the numeric index of the current level in this.playback.levels.
	 */
	activeLevelChanged(info)
	{
		this.activeLevel = this.findLevelBy(info.level);
		this.updateGUI();
	}
	/**
	 * Updates the GUI elements to match our current state.
	 */
	updateGUI()
	{
		this.levelElement().removeClass('current');
		if (this.activeLevel)
			this.levelElement(this.activeLevel.id).addClass('current');
		this.updateText(this.selectedLevelId);
	}
}
