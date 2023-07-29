function getFileName(path) {
	var lastSlashIndex = path.lastIndexOf("/");
	return lastSlashIndex === -1 ? path : path.slice(lastSlashIndex + 1);
}

function getFileNameWithoutExtension(fileName) {
	var lastDotIndex = fileName.lastIndexOf(".");
	return lastDotIndex === -1 || lastDotIndex === fileName.length - 1 || lastDotIndex === 0 ? fileName : fileName.substr(0, lastDotIndex);
}

function getMatchingIndexes(query, target) {
	var targetLower = target.toLowerCase();
	var matchingIndexes = [];
	for (var i = 0; i < query.length; i++) {
		var queryWord = query[i];
		if (queryWord) {
			var found = false;
			var startIndex = -1;
			var queryWordLength = queryWord.length;
			while ((startIndex = targetLower.indexOf(queryWord, startIndex)) !== -1) {
				matchingIndexes.push([startIndex, startIndex + queryWordLength]);
				startIndex += queryWordLength + 1;
				found = true;
			}
			if (!found) {
				return null;
			}
		}
	}
	return function mergeRanges(ranges) {
		if (ranges.length === 0) {
			return ranges;
		}
		ranges.sort(function (a, b) {
			return a[0] - b[0];
		});
		var mergedRanges = [ranges[0]];
		for (var i = 1; i < ranges.length; i++) {
			var currentRange = ranges[i];
			var lastMergedRange = mergedRanges[mergedRanges.length - 1];
			if (lastMergedRange[1] < currentRange[0]) {
				mergedRanges.push(currentRange);
			} else if (lastMergedRange[1] < currentRange[1]) {
				lastMergedRange[1] = currentRange[1];
			}
		}
		return mergedRanges;
	}(matchingIndexes);
}

function getMatchResult(query, target, maxLength) {
	var matchingIndexes = getMatchingIndexes(query, target, maxLength);
	return matchingIndexes ? {
		score: calculateScore(matchingIndexes, query.length, maxLength, 0),
		matches: matchingIndexes
	} : null;
}


function visitMatchingIndexes(results, offset) {
	for (var i = 0; i < results.length; i++) {
		var result = results[i];
		result[0] += offset;
		result[1] += offset;
	}
}

function calculateScore(matchingIndexes, queryLength, maxLength, minScore) {
	var score = minScore;
	var lastEndIndex = -1;
	for (var i = 0; i < matchingIndexes.length; i++) {
		var matchingIndex = matchingIndexes[i];
		var startIndex = matchingIndex[0];
		var endIndex = matchingIndex[1];
		if (startIndex > lastEndIndex) {
			score += (startIndex - lastEndIndex - 1) / maxLength;
		}
		score += (endIndex - startIndex + 1) / maxLength;
		lastEndIndex = endIndex;
	}
	if (lastEndIndex < maxLength - 1) {
		score += (maxLength - lastEndIndex - 1) / maxLength;
	}
	return score / queryLength;
}

function getFileExtension(fileName) {
	return fileName.split(".").pop();
}


var hasOwnProperty = Object.prototype.hasOwnProperty;

function getAliases(frontmatter) {
	return frontmatter ? findMatchingProperties(frontmatter, /^alias(es)?$/i) : null;
}

function findMatchingProperties(obj, pattern, maxLength) {
	if (!obj) {
		return null;
	}
	var propertyValue = function (obj, propertyName) {
		if (typeof propertyName === "string") {
			return hasOwnProperty.call(obj, propertyName) ? obj[propertyName] : null;
		}
		for (var key in obj) {
			if (hasOwnProperty.call(obj, key) && propertyName.test(key)) {
				return obj[key];
			}
		}
		return null;
	}(obj, pattern);
	if (!propertyValue) {
		return null;
	}
	var result = [];
	if (typeof propertyValue === "string") {
		propertyValue = propertyValue.split(/[,\n]/);
	}
	if (Array.isArray(propertyValue)) {
		for (var i = 0; i < propertyValue.length; i++) {
			var value = propertyValue[i];
			if (typeof value === "string") {
				if (maxLength) {
					var words = value.split(/\s/g);
					for (var j = 0; j < words.length; j++) {
						var word = words[j];
						if (word) {
							result.push(word);
						}
					}
				} else {
					value = value.trim();
					if (value) {
						result.push(value);
					}
				}
			}
		}
		return result.length === 0 ? null : result;
	}
	return null;
}

function search(userInputString, dataCacheObject) {
	var query = userInputString.toLowerCase().split(" ");
	var results = [];
	for (var path in dataCacheObject) {
		if (hasOwnProperty.call(dataCacheObject, path) && "md" === getFileExtension(path)) {
			var fileName = getFileName(path);
			var realFileName = getFileNameWithoutExtension(fileName);
			var fileNameMatchResult = getMatchResult(query, fileName, realFileName.length);
			var realFileNameMatchResult = getMatchResult(query, realFileName, fileName.length);
			if (fileNameMatchResult) {
				fileNameMatchResult.score += 0.8;
				visitMatchingIndexes(fileNameMatchResult.matches, realFileName.length - fileName.length);
				results.push({
					type: "file",
					path: path,
					match: fileNameMatchResult
				});
			} else if (realFileNameMatchResult) {
				realFileNameMatchResult.score += 0.5;
				results.push({
					type: "file",
					path: path,
					match: realFileNameMatchResult
				});
			}
			var cacheEntry = dataCacheObject.hasOwnProperty(path) ? dataCacheObject[path] : null
			if (cacheEntry) {
				var aliases = getAliases(cacheEntry.frontmatter);
				if (aliases) {
					for (var i = 0; i < aliases.length; i++) {
						var alias = aliases[i];
						var aliasMatchResult = getMatchResult(query, alias);
						if (aliasMatchResult) {
							results.push({
								type: "alias",
								alias: alias,
								path: path,
								match: aliasMatchResult
							});
						}
					}
				}
				if (cacheEntry.headings) {
					for (var i = 0; i < cacheEntry.headings.length; i++) {
						var heading = cacheEntry.headings[i];
						var headingMatchResult = getMatchResult(query, heading.heading);
						if (headingMatchResult) {
							results.push({
								type: "heading",
								path: path,
								heading: heading,
								match: headingMatchResult
							});
						}
					}
				}
			}
		}
	}

	results.sort(function (a, b) {
		return b.match.score - a.match.score;
	});
	return results.slice(0, 50);
}

window.simpSearch = search;


function highlightText(element, text, matches, offset = 0) {
	highlightNodes(text, matches, offset).forEach(node => {
		element.appendChild(node);
	});
}

function highlightNodes(text, matches, offset = 0) {
	if (!matches) return [document.createTextNode(text)];

	const fragments = [];

	let start = 0;
	for (let i = 0; i < matches.length; i++) {
		const [matchStart, matchEnd] = matches[i];

		const adjustedStart = matchStart + offset;
		const adjustedEnd = matchEnd + offset;

		if (adjustedEnd <= 0) continue;

		if (adjustedStart >= text.length) break;

		if (adjustedStart > start) {
			fragments.push(document.createTextNode(
				text.substring(start, adjustedStart)
			));
		}

		fragments.push(createHighlightNode(
			text.substring(adjustedStart, adjustedEnd)
		))

		start = adjustedEnd;
	}

	if (start < text.length) {
		fragments.push(document.createTextNode(
			text.substring(start)
		))
	}

	return fragments;
}

function createHighlightNode(text) {
	const span = document.createElement("span");
	span.classList.add("suggestion-highlight");
	span.textContent = text;
	return span;
}
function defineProperty(obj, prop, val) {
	Object.defineProperty(obj, prop, {
		value: val,
		enumerable: !1,
		configurable: !0,
		writable: !0
	})
}

function createGetter(obj, prop, getterFn) {
	Object.defineProperty(obj, prop, {
		get: getterFn,
		enumerable: false,
		configurable: true
	});
}
function initUtils() {
	defineProperty(Element.prototype, 'matchParent', function (selector, root) {
		if (this.matches(selector)) return this;
		if (this === root) return null;
	
		const parent = this.parentElement;
		return parent ? parent.matchParent(selector, root) : null;
	});
}

initUtils();

class SuggestionsList {
	constructor(chooser, containerEl) {
		this.chooser = chooser;
		this.containerEl = containerEl;
		this.selectedItem = 0;
		// 注册点击、鼠标移入事件
		this.containerEl.addEventListener("click", this.onSuggestionClick.bind(this));
		this.containerEl.addEventListener("mousemove", this.onSuggestionMouseover.bind(this));
	}

	moveUp(event) {
		if (!event.isComposing) {
			const prevIndex = this.selectedItem - 1;
			if (prevIndex >= 0) {
				this.setSelectedItem(prevIndex, event);
				return false;
			}
		}
	}

	moveDown(event) {
		if (!event.isComposing) {
			const nextIndex = this.selectedItem + 1;
			if (nextIndex < this.suggestions.length) {
				this.setSelectedItem(nextIndex, event);
				return false;
			}
		}
	}

	setSuggestions(suggestions) {
		while (this.containerEl.firstChild) {
			this.containerEl.removeChild(this.containerEl.firstChild);
		}
		this.values = suggestions;
		this.renderSuggestions();
		this.setSelectedItem(0);
	}

	renderSuggestions() {
		this.suggestions = [];
		this.values.forEach(suggestion => {
			const item = this.createSuggestionItem(suggestion);
			this.suggestions.push(item);
		});
	}

	createSuggestionItem(suggestion) {
		const item = document.createElement("div");
		item.classList.add('suggestion-item');
		this.containerEl.appendChild(item);
		this.chooser.renderSuggestion(suggestion, item);
		return item;
	}

	setSelectedItem(index, event) {
		const previous = this.suggestions[this.selectedItem];
		previous?.classList.remove("is-selected");
		this.selectedItem = index;
		this.selectSuggestionItem(index, event);
	}

	selectSuggestionItem(index, event) {
		const item = this.suggestions[index];

		// 高亮选中项        
		item?.classList.add("is-selected");

		// 滚动到可视区域         
		item?.scrollIntoView({
			block: 'nearest'
		});

		// 存储上一个选中索引        
		const prevIndex = this.selectedItem;

		// 更新选中索引        
		this.selectedItem = index;

		// 取消上一个选中项的高亮        
		if (prevIndex !== index) {
			const prevItem = this.suggestions[prevIndex];
			prevItem && prevItem.classList.remove("is-selected");
		}

		// 通知 chooser 选项变更                  
		this.chooser.onSelectedChange && this.chooser.onSelectedChange(this.values[index], event);
	}

	onSuggestionClick(event) {
		const matchedTarget = event.target.matchParent('.suggestion-item', event.currentTarget);

		if (!matchedTarget) {
			return;
		}
		const item = matchedTarget;
		// 获取建议项索引
		const index = this.suggestions.indexOf(item);

		// 高亮选中项,并使用选择
		this.setSelectedItem(index, event);
		this.useSelectedItem(event);
	}

	onSuggestionMouseover(event) {

		const matchedTarget = event.target.matchParent('.suggestion-item', event.currentTarget);

		if (!matchedTarget) {
			return;
		}

		const item = matchedTarget;
		// 获取建议项索引 
		const index = this.suggestions.indexOf(item);

		// 高亮建议项 but 不使用选择
		this.setSelectedItem(index, event);
	}

	useSelectedItem(event) {
		const selection = this.values[this.selectedItem];
		if (selection) {
			// 通知 chooser 选择建议
			this.chooser.selectSuggestion(selection, event);

			// 建议已使用,清空列表      
			this.setSuggestions([]);

			return true;
		}
		return false;
	}

}

window.SuggestionsList = SuggestionsList;

function positionTooltip(originRect, tooltipEl, options) {
	options = options || {};

	const gap = options.gap || 0;
	const verticalPreference = options.preference || 'bottom';
	const containerEl = options.offsetParent || tooltipEl.offsetParent || tooltipEl.doc.documentElement;
	const horizontalAlignment = options.horizontalAlignment || 'left';

	const containerScrollTop = containerEl.scrollTop + 10;
	const containerBottom = containerEl.scrollTop + containerEl.clientHeight - 10;

	const tooltipTop = Math.min(originRect.top, containerBottom);
	const tooltipBottom = Math.max(originRect.bottom, containerScrollTop);

	const tooltipHeight = tooltipEl.offsetHeight;

	let tooltipVerticalPosition = 0;
	let result;

	if (tooltipTop - containerScrollTop >= tooltipHeight + gap) {
		// Fits on top 
		result = 'top';
		tooltipVerticalPosition = tooltipTop - gap - tooltipHeight;
	} else if (containerBottom - originRect.bottom >= tooltipHeight + gap) {
		// Fits on bottom              
		result = 'bottom';
		tooltipVerticalPosition = tooltipBottom + gap;
	} else {
		// Overlap
		result = 'overlap';

		if (verticalPreference === 'top') {
			tooltipVerticalPosition = containerScrollTop + gap;
		} else {
			tooltipVerticalPosition = containerBottom - tooltipHeight;
		}
	}  

	let horizontalPosition

	const containerLeft = containerEl.scrollLeft + 10;
	const containerRight = containerEl.scrollLeft + containerEl.clientWidth - 10;

	const tooltipWidth = tooltipEl.offsetWidth;

	if (horizontalAlignment === 'left') {
		horizontalPosition = originRect.left;
	} else {
		horizontalPosition = originRect.right - tooltipWidth;
	}

	horizontalPosition = Math.max(horizontalPosition, containerLeft);
	horizontalPosition = Math.min(horizontalPosition, containerRight - tooltipWidth);

	tooltipEl.style.top = `${tooltipVerticalPosition}px`;
	tooltipEl.style.left = `${horizontalPosition}px`;

	return {
		top: tooltipVerticalPosition,
		left: horizontalPosition,
		result
	};
}

class SearchView {
	constructor(setupOnNode, metadata) {
		// Initialize DOM elements
		this.outerContainerEl = document.createElement('div');
		this.outerContainerEl.classList.add("search-view-outer");
		this.containerEl = setupOnNode.querySelector('.search-view-container');
		this.inputEl = setupOnNode.querySelector('.search-bar')
		this.resultEl = document.createElement('div');
		this.resultEl.classList.add("search-results");


		this.metadata = metadata;

		// Initialize key bindings
		// this.scope = new KeymapScope();

		// Initialize suggestions
		this.chooser = new SuggestionsList(this, this.resultEl);

		// Event listeners
		this.inputEl.addEventListener("input", () => {
			console.log('update search...');
			this.updateSearch();
		});
	}

	addMessage(text) {    
		const messageEl = document.createElement('div');
		messageEl.classList.add("search-message");
		this.resultEl.appendChild(messageEl);
		messageEl.innerText = text;
	}
	updateSearch() {
		while (this.resultEl.firstChild) {
			this.resultEl.removeChild(this.resultEl.firstChild);
		}

		if (!this.inputEl.value) {
			this.inputEl.classList.remove("has-no-results");
			// this.resultEl.detach()
			this.resultEl.parentElement.removeChild(this.resultEl);
			return;
		}

		document.body.appendChild(this.resultEl);
		positionTooltip(this.inputEl.getBoundingClientRect(), this.resultEl, {
			gap: 5
		});

		// Get search results and render suggestions
		const results = search(this.inputEl.value, this.metadata)
		this.chooser.setSuggestions(results);
		
		if (0 === results.length) {
			this.inputEl.classList.toggle('has-no-results', true);
			this.chooser.addMessage("No results found.")
		}
	}

	renderSuggestion(item, el) {
		el.classList.add("mod-complex");

		const contentEl = document.createElement("div");
		contentEl.classList.add('suggestion-content');
		const titleEl = document.createElement("div");
		titleEl.classList.add('suggestion-title');
		const noteEl = document.createElement("div");
		noteEl.classList.add('suggestion-note');

		contentEl.appendChild(titleEl);
		contentEl.appendChild(noteEl);
		const auxEl = document.createElement("div");
		auxEl.classList.add('suggestion-aux');

		el.appendChild(contentEl);
		el.appendChild(auxEl);

		if (item.type === "file") {
			const filename = getFileName(item.path);

			const index = item.path.lastIndexOf('/');
			const dirName = index === -1 ? '.' : item.path.substring(0, index);
			highlightText(noteEl, dirName, item.match);
			highlightText(titleEl, filename, item.match, item.path.length - filename.length);
		}
		else if (item.type === "heading") {
			titleEl.innerText = `# ${item.heading.heading}`;
  
			highlightText(titleEl, item.heading.heading, item.match);
			
			noteEl.innerText = item.path;
			
			const span = document.createElement('span');
			span.classList.add('suggestion-flair');
			span.innerText = 'H';
			auxEl.appendChild(span);

			// auxEl.createSpan({
			//   cls: "suggestion-flair",  
			//   text: "H",
			//   prepend: true  
			// });
		}
	}

	selectSuggestion(item, event) {
		if (item.type === "file" || item.type === "alias") {
			// Navigate to file/alias      
			loadDocument(item.path?.replace(/\.md$/, '.html'), true, false);
		}
		else if (item.type === "heading") {
			// Navigate to heading      
			loadDocument(
				item.path?.replace(/\.md$/, '.html') + "#" + encodeURIComponent(item.heading.heading),
				true,
				true
			);
		}

		// Clear input and update results
		this.inputEl.value = "";
		this.updateSearch();

		// Close left column       
		this.containerEl.classList.remove("is-left-column-open");
	}
}

window.SearchView = SearchView;