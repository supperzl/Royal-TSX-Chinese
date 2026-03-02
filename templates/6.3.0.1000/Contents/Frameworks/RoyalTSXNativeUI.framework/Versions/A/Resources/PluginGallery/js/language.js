var language = {
	currentLanguage: "en",
	currentLanguageContent: null,

	init: function (initialLanguage) {
		language.activeLanguage(initialLanguage);
	},

	normalizeLanguageCode: function (languageCode) {
		if (!languageCode) {
			return "en";
		}

		try {
			var normalized = String(languageCode).toLowerCase().replace("_", "-").split("-")[0];
			if (!normalized) {
				return "en";
			}

			if (normalized === "zh") {
				return "zh";
			}

			if (normalized === "de") {
				return "de";
			}

			if (normalized === "en") {
				return "en";
			}

			return "en";
		} catch (ex) {
			return "en";
		}
	},

	activeLanguage: function (newActiveLanguage) {
		if (newActiveLanguage) {
			try {
				var normalizedLanguage = language.normalizeLanguageCode(newActiveLanguage);
				language.currentLanguageContent = eval("language_file_" + normalizedLanguage);
				language.currentLanguage = normalizedLanguage;
			} catch (ex) {
				language.currentLanguage = "en";
				language.currentLanguageContent = eval("language_file_" + language.currentLanguage);
			}
		}

		return language.currentLanguage;
	},

	get: function (text) {
		if (language.currentLanguageContent == null ||
			!language.currentLanguageContent.hasOwnProperty(text)) {
			return text;
		}

		return language.currentLanguageContent[text];
	},

	formatString: function (str) {
		for (i = 1; i < arguments.length; i++) {
			str = str.replace("{" + (i - 1) + "}", arguments[i]);
		}

		return str;
	},

	getFormat: function (text, args) {
		text = language.get(text);

		try {
			text = language.formatString(text, args);
		} catch (ex) { }

		return text;
	}
};
