/**
 Shows a list of stories. Each list item is managed by a StoryItemView.

 @class StoryListView
 @extends Backbone.Marionette.CompositeView
**/

'use strict';
const Vue = require('vue');
const locale = require('../locale');
const eventHub = require('../common/eventHub');
const { check: checkForAppUpdate } = require('../dialogs/app-update');
const { check: checkForDonation } = require('../dialogs/app-donation');
const ImportDialog = require('../dialogs/story-import');

require('./index.less');

module.exports = Vue.extend({
	template: require('./index.html'),

	props: {
		appearFast: {
			type: Boolean,
			default: false
		},

		previouslyEditing: {
			type: String,
			default: null
		}
	},

	data: () => ({
		/*
		Set the default story list sorting to 'name', 'asc' (i.e. A → Z).
		*/

		storyOrder: 'name',
		storyOrderDir: 'asc',
		showPrompt: false,
		showConfirm: false,
		showCustomModal: false,
		customModalComponent: null,
		customModalComponentData: null,
		promptArgs: {},
		confirmArgs: {}
	}),

	computed: {
		sortDateButtonClass() {
			return 'subtle' + (this.storyOrder === 'lastUpdate' ? ' active' : '');
		},
		sortDateButtonTitle() {
			return locale.say('Last changed date');
		},
		sortNameButtonClass() {
			return 'subtle' + (this.storyOrder === 'name' ? ' active' : '');
		},
		sortNameButtonTitle() {
			return locale.say('Story name');
		},
		sortedStories() {
			/*
			If we have no stories to sort, don't worry about it.
			*/

			if (this.stories.length === 0) {
				return this.stories;
			}

			switch (this.storyOrder) {
				case 'name':
					return this.stories.sort((a, b) => {
						if (a.name > b.name) {
							return this.storyOrderDir === 'asc' ? 1 : -1;
						}

						if (a.name < b.name) {
							return this.storyOrderDir === 'asc' ? -1 : 1;
						}

						return 0;
					});

				case 'lastUpdate':
					return this.stories.sort((a, b) => {
						const aTime = a.lastUpdate.getTime();
						const bTime = b.lastUpdate.getTime();

						if (aTime > bTime) {
							return this.storyOrderDir === 'asc' ? 1 : -1;
						}

						if (aTime < bTime) {
							return this.storyOrderDir === 'asc' ? -1 : 1;
						}

						return 0;
					});

				default:
					throw new Error(`Don't know how to sort by '${this.storyOrder}'`);
			}
		},

		storyCountDesc() {
			return locale.sayPlural('%d Story', '%d Stories', this.stories.length);
		}
	},

	watch: {
		storyCountDesc: {
			handler(value) {
				document.title = value;
			},

			immediate: true
		}
	},

	mounted() {
		eventHub.$on('modalPrompt', promptArgs => {
			this.promptArgs = promptArgs;
			this.showPrompt = true;
		});
		eventHub.$on('modalConfirm', confirmArgs => {
			this.confirmArgs = confirmArgs;
			this.showConfirm = true;
		});
		eventHub.$on('close', () => {
			this.showPrompt = false;
			this.showConfirm = false;
			this.showCustomModal = false;
		});

		this.$nextTick(function() {
			// code that assumes this.$el is in-document

			/* If we were asked to appear fast, we do nothing. */

			if (this.appearFast) {
				return;
			}

			/*
			Otherwise, we check to see if we should ask for a donation,
			 and then an app update...
			*/

			if (!this.appearFast && !checkForDonation(this.$store)) {
				checkForAppUpdate(this.$store);
			}

			/*
			And if the user had been previously editing a story
			 (as the router will tell us),
			  we broadcast an event so that an appropriate child component
			can set up a zoom transition back into itself.
			*/

			if (this.previouslyEditing) {
				eventHub.$emit('previously-editing', this.previouslyEditing);
			}
		});
	},

	methods: {
		newCustomModal(customModalComponent, data) {
			this.customModalComponent = customModalComponent;
			this.customModalComponentData = data;
			this.showCustomModal = true;
		},
		sortByDate() {
			/*
			If the last story order was 'lastUpdate', toggle the story order
			direction.  Elsewise, default to 'desc' (i.e. newest -> oldest).
			*/

			if (this.storyOrder === 'lastUpdate') {
				this.storyOrderDir = this.storyOrderDir === 'asc' ? 'desc' : 'asc';
			} else {
				this.storyOrderDir = 'desc';
			}

			this.storyOrder = 'lastUpdate';
		},

		sortByName() {
			/*
			If the last story order was 'name', toggle the story order
			direction. Elsewise, default to 'asc' (i.e. A -> Z).
			*/

			if (this.storyOrder === 'name') {
				this.storyOrderDir = this.storyOrderDir === 'asc' ? 'desc' : 'asc';
			} else {
				this.storyOrderDir = 'asc';
			}

			this.storyOrder = 'name';
		}
	},

	components: {
		'story-item': require('./story-item'),
		'list-toolbar': require('./list-toolbar'),
		'file-drag-n-drop': require('../ui/file-drag-n-drop')
	},

	created: function() {
		/* For now, we only support importing a single file at a time. */

		eventHub.$on('file-drag-n-drop', files => {
			this.newCustomModal(ImportDialog, { immediateImport: files[0] });
		});
	},

	vuex: {
		getters: {
			stories: state => state.story.stories
		}
	}
});
