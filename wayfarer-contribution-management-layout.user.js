// ==UserScript==
// @name         Wayfarer Contribution Management Layout
// @version      0.0.3
// @description  Improves the layout of the Contribution Management page
// @namespace    https://github.com/tehstone/wayfarer-addons/
// @downloadURL  @downloadURL  https://github.com/tehstone/wayfarer-addons/raw/main/wayfarer-contribution-management-layout.user.js
// @homepageURL  https://github.com/tehstone/wayfarer-addons/
// @match        https://wayfarer.nianticlabs.com/*
// @run-at       document-start
// ==/UserScript==

// Copyright 2024 Tntnnbltn
// This file is part of the Wayfarer Addons collection.

// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/tehstone/wayfarer-addons/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.

/* eslint-env es6 */
/* eslint no-var: "error" */

function init() {
    let tryNumber = 10;
    let nominations;
    let darkMode = false;

    let contributionTypeSetting = 'text';

    const savedSettings = localStorage.getItem('wfcml-settings');

    if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.contributionTypeSetting) {
            contributionTypeSetting = parsedSettings.contributionTypeSetting;
        }
    }

    /**
     * Overwrite the open method of the XMLHttpRequest.prototype to intercept the server calls
     */
    (function (open) {
        XMLHttpRequest.prototype.open = function (method, url) {
            if (url == '/api/v1/vault/manage') {
                if (method == 'GET') {
                    this.addEventListener('load', parseNominations, false);
                }
            } else if (url == '/api/v1/vault/properties') {
                if (method == 'GET') {
                    this.addEventListener('load', interceptProperties, false);
                }
            } else if (url == '/api/v1/vault/settings') {
                if (method == 'GET') {
                    this.addEventListener('load', interceptSettings, false);
                }
            }
            open.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open);

    function parseNominations(e) {
        try {
            const response = this.response;
            const json = JSON.parse(response);
            if (!json) {
                console.log('Failed to parse response from Wayfarer');
                return;
            }
            // ignore if it's related to captchas
            if (json.captcha)
                return;

            nominations = json.result.nominations;
            if (!nominations) {
                console.log('Wayfarer\'s response didn\'t include nominations.');
                return;
            }
            detectAppListItems();
        } catch (e)    {
            console.log(e); // eslint-disable-line no-console
        }
    }

    function interceptProperties() {
        try {
            const response = this.response;
            const json = JSON.parse(response);
            if (!json) return;
            if (!json.result || !json.result.darkMode) return;

            const darkModeSetting = json.result.darkMode
            if (darkModeSetting === "DISABLED") {
                darkMode = false;
            } else {
                darkMode = true;
            }
        } catch (e) {
            console.error(e);
        }
    }

    function interceptSettings() {
        try {
            const response = this.response;
            const json = JSON.parse(response);
            if (!json) return;

            modifySettingsPage();
        } catch (e) {
            console.error(e);
        }
    }

    const awaitElement = get => new Promise((resolve, reject) => {
        let triesLeft = 10;
        const queryLoop = () => {
            const ref = get();
            if (ref) resolve(ref);
            else if (!triesLeft) reject();
            else setTimeout(queryLoop, 100);
            triesLeft--;
        }
        queryLoop();
    });

    const getL10N = () => {
        const i18n = JSON.parse(localStorage['@transloco/translations']);
        return i18n['en'];
    };

    function modifySettingsPage() {
        const l10n = getL10N();

        return new Promise(async (resolve, reject) => {
            try {
                const settingsItem = await awaitElement(() => document.querySelector('.settings__item'));

                const parentDiv = settingsItem.parentElement;

                const newSettingsItem = document.createElement('div');
                newSettingsItem.classList.add('settings__item', 'settings-item');

                const headerDiv = document.createElement('div');
                headerDiv.classList.add('settings-item__header');

                const titleDiv = document.createElement('div');
                titleDiv.textContent = 'Contribution Management Layout Plug-In';

                headerDiv.appendChild(titleDiv);

                const valueDiv = document.createElement('div');
                valueDiv.classList.add('settings-item__value');

                const descriptionDiv = document.createElement('div');
                descriptionDiv.classList.add('settings-item__description');

                const descriptionParagraph = document.createElement('div');
                descriptionParagraph.textContent = 'How would you like the contribution type to be displayed on the Contribution Management list?';
                descriptionParagraph.style.marginBottom = '10px';
                descriptionDiv.appendChild(descriptionParagraph);

                // Function to update contributionTypeSetting and save the value to localStorage
                function updateContributionTypeSetting(setting) {
                    contributionTypeSetting = setting;
                    localStorage.setItem('wfcml-settings', JSON.stringify({ contributionTypeSetting }));
                }

                const options = [
                    { value: 'text', label: 'Display as text under the Wayspot title' },
                    { value: 'icon', label: 'Display as an icon next to the Wayspot title' },
                    { value: 'vanilla', label: 'Do not modify — Use original appearance' }
                ];

                options.forEach(option => {
                    const radioButton = document.createElement('input');
                    radioButton.type = 'radio';
                    radioButton.name = 'contributionDisplayOption';
                    radioButton.value = option.value;
                    radioButton.checked = contributionTypeSetting === option.value;
                    radioButton.addEventListener('change', () => updateContributionTypeSetting(option.value));

                    const label = document.createElement('label');
                    label.textContent = option.label;
                    label.style.marginLeft = '10px';
                    descriptionParagraph.style.marginTop = '10px';

                    descriptionDiv.appendChild(radioButton);
                    descriptionDiv.appendChild(label);
                    descriptionDiv.appendChild(document.createElement('br'));
                });

                newSettingsItem.appendChild(headerDiv);
                newSettingsItem.appendChild(valueDiv);
                newSettingsItem.appendChild(descriptionDiv);

                parentDiv.appendChild(newSettingsItem);

                parentDiv.insertBefore(newSettingsItem, parentDiv.children[3]);

                resolve();
            } catch (error) {
                console.error('Error modifying settings page:', error);
                reject(error);
            }
        });
    }

    // Function to log when <app-nominations-list-item> elements are added to the DOM
    async function detectAppListItems() {
        try {
            const parentContainer = await awaitElement(() => document.querySelector('.cdk-virtual-scroll-content-wrapper'));
            // Scan existing elements
            const existingItems = parentContainer.querySelectorAll('app-nominations-list-item');
            console.log(existingItems);
            existingItems.forEach(item => {
                formatItem(item);
            });
            // Set up MutationObserver for new elements
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeName === 'APP-NOMINATIONS-LIST-ITEM') {
                            formatItem(node);
                        }
                    });
                });
            });
            observer.observe(parentContainer, { childList: true, subtree: true });
        } catch (error) {
            console.error('Failed to find parent container:', error);
        }
    }

    function formatItem(item) {
        const data = item["__ngContext__"][22];
        if (data.poiData) {
            replacePhoto(item, data);
            formatText(item, data);
            addClickListener(item, data);
        }
    }

    function addClickListener(item, data) {
        console.log('adding click listener for details');
        item.addEventListener('click', function(event) {
            interceptDetailsPane(data);
        });
    }

    // Show the user's submitted photo thumbnail in the menu instead of current Wayspot photo
    function replacePhoto(item, data) {
        if (data.type === "PHOTO") {
            const imageUrl = data.imageUrl;
            const imageElement = item.querySelector('img');
            if (imageElement) {
                imageElement.src = imageUrl;
            }
        }
    }

    function formatText(item, data) {
        if (contributionTypeSetting === 'vanilla') {
            return;
        }

        const titleElement = item.querySelector('.flex-row.items-center .ng-star-inserted');
        const contentElement = item.querySelector('.nominations-item__content');

        let nominationTitle = '';

        if (data.type === "NOMINATION") {
            if (contentElement) {
                contentElement.textContent = '';
            }
        }

        if (data.type === "NOMINATION") {
            nominationTitle = data.title
        } else {
            nominationTitle = data.poiData.title;
        }

        if (titleElement) {
            titleElement.textContent = '';

            if (contributionTypeSetting === 'icon') {
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.alignItems = 'center';

                const svgContainer = document.createElement('div');
                svgContainer.style.width = '15px'; // Set width for SVG container
                const svg = createSVG(data.type);
                svgContainer.appendChild(svg);
                container.appendChild(svgContainer);

                const textSpan = document.createElement('span');
                textSpan.textContent = nominationTitle;
                textSpan.style.paddingLeft = '5px';
                textSpan.classList.add('font-bold');
                container.appendChild(textSpan);

                titleElement.appendChild(container);
            } else if (contributionTypeSetting === 'text') {
                titleElement.textContent = nominationTitle;
                titleElement.classList.add('font-bold');

                // Remove any existing contribution-type-label
                const existingTypeLabel = item.querySelector('.contribution-type-label');
                if (existingTypeLabel) {
                    existingTypeLabel.parentNode.removeChild(existingTypeLabel);
                }

                // Create a new div and append after titleElement
                const typeTextMap = {
                    "NOMINATION": "Wayspot Submission",
                    "PHOTO": "Photo Submission",
                    "EDIT_DESCRIPTION": "Description Edit",
                    "EDIT_TITLE": "Title Edit",
                    "EDIT_LOCATION": "Location Edit"
                };

                const typeText = typeTextMap[data.type];
                if (typeText) {
                    const typeDiv = document.createElement('div');
                    typeDiv.textContent = typeText;
                    typeDiv.classList.add('text-xs', 'contribution-type-label');
                    typeDiv.style.fontStyle = 'italic';
                    titleElement.parentNode.parentNode.insertBefore(typeDiv, titleElement.parentNode.nextSibling);
                }
            }
        }
    }

    function createSVG(type) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("version", "1.1");
        svg.setAttribute("viewBox", "0 0 512 512");
        svg.setAttribute("xml:space", "preserve");
        svg.setAttribute("width", "15");
        svg.setAttribute("height", "15");

        let color = '#525252';
        if (darkMode) {
            color = '#d4d4d4'
        }

        switch (type) {
            case 'NOMINATION':
                svg.innerHTML = `<g transform="matrix(5.5202 0 0 5.5202 7.5948 7.5921)"><path d="m45 0c-19.537 0-35.375 15.838-35.375 35.375 0 8.722 3.171 16.693 8.404 22.861l26.971 31.764 26.97-31.765c5.233-6.167 8.404-14.139 8.404-22.861 1e-3 -19.536-15.837-35.374-35.374-35.374zm0 48.705c-8.035 0-14.548-6.513-14.548-14.548s6.513-14.548 14.548-14.548 14.548 6.513 14.548 14.548-6.513 14.548-14.548 14.548z" fill="${color}" stroke-linecap="round"/></g>`
                break;
            case 'PHOTO':
                svg.innerHTML = `<path d="m190.39 84.949c-6.6975 5.26e-4 -12.661 4.2407-14.861 10.566l-16.951 48.736h-86.783c-16.463 8e-5 -29.807 13.346-29.807 29.809v221.27c-1.31e-4 17.518 14.201 31.719 31.719 31.719h360.38c19.84 1.8e-4 35.922-16.084 35.922-35.924v-215.54c5.2e-4 -17.307-14.029-31.337-31.336-31.338h-86.865l-16.549-48.605c-2.1787-6.3967-8.1858-10.698-14.943-10.697h-129.92zm224.45 102.69c12.237 5.2e-4 22.156 9.8009 22.156 21.889 3.9e-4 12.088-9.9185 21.888-22.156 21.889-12.238 5.4e-4 -22.161-9.7994-22.16-21.889 7e-4 -12.088 9.9224-21.889 22.16-21.889zm-158.85 30.947c37.042-8.9e-4 67.071 30.028 67.07 67.07-1.9e-4 37.042-30.029 67.069-67.07 67.068-37.041-1.8e-4 -67.07-30.028-67.07-67.068-8.9e-4 -37.041 30.029-67.07 67.07-67.07z" fill="${color}" />`;
                break;
            case 'EDIT_LOCATION':
                svg.innerHTML = `<path d="m275.28 191.57-37.927 265.39-182.75-401.92zm182.12 46.046-274.31 38.177-128.26-220.75z" stroke-linecap="round" stroke-linejoin="round" fill="${color}" stroke="${color}" stroke-width="26.07"/>`;
                break;
            case 'EDIT_TITLE':
                svg.innerHTML = `<path d="m15.116 412.39v84.373h84.373" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="30"/><path d="m496.66 412.24v84.373h-84.373" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="30"/><path d="m14.915 100.07v-84.373h84.373" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="30"/><path d="m496.46 100.22v-84.373h-84.373" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="30"/><path d="m81.232 82.633v142.8l29.4 1.4004c1.2444-20.844 3.4221-38.112 6.5332-51.801 3.4222-14 7.7775-25.044 13.066-33.133 5.6-8.4 12.291-14.156 20.068-17.268 7.7778-3.4222 16.955-5.1328 27.533-5.1328h42.467v261.33c0 14.311-13.844 21.467-41.533 21.467v27.066h155.4v-27.066c-28 0-42-7.1557-42-21.467v-261.33h42c10.578 0 19.755 1.7106 27.533 5.1328 7.7778 3.1111 14.313 8.8676 19.602 17.268 5.6 8.0889 9.9553 19.133 13.066 33.133 3.4222 13.689 5.7556 30.956 7 51.801l29.4-1.4004v-142.8h-349.54z" fill="${color}" />`
                break;
            case 'EDIT_DESCRIPTION':
                svg.innerHTML = `<path d="m15.116 412.39v84.373h84.373" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="30"/><path d="m496.66 412.24v84.373h-84.373" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="30"/><path d="m14.915 100.07v-84.373h84.373" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="30"/><path d="m496.46 100.22v-84.373h-84.373" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="30"/><path d="m79.133 82.633v27.533c27.689 0 41.533 7.1557 41.533 21.467v249.2c0 14.311-13.844 21.467-41.533 21.467v27.066h182c28.311 0 53.201-2.9561 74.668-8.8672s39.355-15.867 53.666-29.867c14.622-14 25.51-32.667 32.666-56 7.1556-23.333 10.734-52.577 10.734-87.732 0-34.533-3.5788-62.533-10.734-84-7.1556-21.467-18.044-38.111-32.666-49.934-14.311-11.822-32.199-19.756-53.666-23.801-21.467-4.3556-46.357-6.5332-74.668-6.5332h-182zm112.93 36.867h76.533c17.422 0 31.889 2.489 43.4 7.4668 11.822 4.6667 21.156 12.134 28 22.4 7.1556 10.267 12.134 23.644 14.934 40.133 2.8 16.178 4.1992 35.779 4.1992 58.801 0 23.022-1.3992 43.555-4.1992 61.6s-7.778 33.288-14.934 45.732c-6.8444 12.133-16.178 21.467-28 28-11.511 6.2222-25.978 9.334-43.4 9.334h-76.533v-273.47z" fill="${color}"/>`
                break;
        }
        return svg;
    }

    async function interceptDetailsPane(data) {
        const existingDetailsContainer = document.querySelector('.wfcml-details-container');
        if (existingDetailsContainer) {
            existingDetailsContainer.parentNode.removeChild(existingDetailsContainer);
        }

        const detailsSections = document.querySelectorAll('.details-pane__section');

        addCoordinates(data);

        if (data.type === 'NOMINATION') {
            // Unhide things that may have been hidden on the Edits page
            detailsSections.forEach(section => {
                const elementsToShow = section.querySelectorAll(':scope > *:nth-child(-n+2)');
                elementsToShow.forEach(element => {
                    element.style.removeProperty('display');
                });
            });
            return;
        }
        const detailsContainer = document.createElement('div');
        detailsContainer.classList.add('wfcml-details-container');
        detailsContainer.style.display = 'flex';
        detailsContainer.style.flexDirection = 'row';

        const winWidth = window.innerWidth;
        const divWidth = (winWidth > 768 && winWidth < 1024) || winWidth > 1344 ? 50 : 100;
        const mapDiv = document.createElement('div');
        mapDiv.textContent = 'Location';
        mapDiv.classList.add('map-column');
        mapDiv.style.flex = `1 1 ${divWidth}%`;

        const infoBoxDiv = document.createElement('div');
        infoBoxDiv.classList.add('details-column');
        infoBoxDiv.style.flex = `1 1 ${divWidth}%`;

        const header = document.createElement('div');
        header.textContent = 'Current Wayspot Details';
        infoBoxDiv.appendChild(header);

        const wayspotDetails = document.createElement('div');
        if (darkMode) {
            wayspotDetails.style.backgroundColor = '#444444';
        } else {
            wayspotDetails.style.backgroundColor = '#e4e4e4';
        }
        wayspotDetails.style.borderRadius = '10px';
        wayspotDetails.style.padding = '10px';
        wayspotDetails.style.marginTop = '10px';
        wayspotDetails.style.marginRight = '20px';

        // Title
        const title = document.createElement('div');
        title.textContent = data.poiData.title;
        title.style.fontWeight = 'bold';
        title.style.textAlign = 'center';
        wayspotDetails.appendChild(title);

        // Image
        const image = document.createElement('img');
        image.src = data.poiData.imageUrl;
        image.style.width = '100%';
        image.style.borderRadius = '10px';
        image.style.marginTop = '5px';
        image.style.marginBottom = '5px';
        wayspotDetails.appendChild(image);

        // Description
        const description = document.createElement('div');
        description.textContent = data.poiData.description || "<No Description>";
        description.style.textAlign = 'left';
        wayspotDetails.appendChild(description);

        infoBoxDiv.appendChild(wayspotDetails);

        detailsContainer.appendChild(infoBoxDiv);
        detailsContainer.appendChild(mapDiv);

        const secondDetailsSection = detailsSections[1];

        if (secondDetailsSection) {
            secondDetailsSection.parentNode.insertBefore(detailsContainer, secondDetailsSection);
        }

        detailsSections.forEach((section, index) => {
            if (index === 0) {
                // Hide the 'Current Wayspot' data
                if (data.type === 'PHOTO') {
                    const elementsToHide = section.querySelectorAll(':scope > *:nth-child(-n+2)');
                    elementsToHide.forEach(element => {
                        element.style.display = 'none';
                    });
                } else {
                    section.children[0].style.display = 'none';
                }
            } else if (index === 1) {
                // For the static map
                const elementsToHide = section.querySelectorAll(':scope > *:nth-child(-n+2)');
                elementsToHide.forEach(element => {
                    element.style.display = 'none';
                });
            }
        });

        addStreetView(data);
    }


    function addCoordinates(data) {

        const lat = data.poiData?.lat || data.lat;
        const lng = data.poiData?.lng || data.lng;

        awaitElement(() => document.querySelector("app-nominations app-details-pane p"))
            .then((locationP) => {
            const coordinates = `${lat},${lng}`;
            const newText = `${data.city} ${data.state} (${coordinates})`;
            locationP.innerText = newText;
            locationP.style.cursor = 'pointer';
            locationP.title = 'Copy coordinates to clipboard';
            locationP.onclick = function() {
                navigator.clipboard.writeText(coordinates);
            }
        });
    }

    async function addStreetView(selected) {
        if (typeof google === 'undefined') {
            setTimeout(addStreetView, 100, selected);
            return;
        }

        const ref = document.querySelector('.map-column');
        if (!ref) {
            console.error('Failed to find map column');
            return;
        }

        if (!document.getElementById("satmap")) {
            const SVMapElement = document.createElement("div");
            SVMapElement.id = "satmap";
            SVMapElement.style.marginTop = "10px";
            SVMapElement.style.borderRadius = "10px";
            SVMapElement.style.overflow = "hidden";
            ref.appendChild(SVMapElement);

            // Create an image element to track the image's loading status
            // This helps make sure that the streetview window is the right height
            const image = new Image();
            image.src = selected.poiData.imageUrl;
            image.style.display = 'none';

            image.addEventListener('load', function() {
                const detailsColumnHeight = parseFloat(getComputedStyle(document.querySelector('.details-column')).height);
                const SVMapHeight = detailsColumnHeight - 31;
                SVMapElement.style.height = SVMapHeight + 'px';
            });

            // Append the image element to the document body to trigger image loading
            document.body.appendChild(image);
        }

        const { lat, lng, title } = selected.poiData;
        const SVMap = new google.maps.Map(document.getElementById("satmap"), {
            center: { lat, lng },
            mapTypeId: "hybrid",
            zoom: 17,
            scaleControl: true,
            scrollwheel: true,
            gestureHandling: 'greedy',
            mapTypeControl: true,
            tiltInteractionEnabled: false,
        });

        if (selected.type === 'EDIT_LOCATION') {
            const editLat = selected.lat;
            const editLng = selected.lng;

            if (editLat !== lat || editLng !== lng) {
                const editMarker = new google.maps.Marker({
                    map: SVMap,
                    position: new google.maps.LatLng(editLat, editLng),
                    icon:  generateSvgMapMarker('c955e0')
                });
            }
        }

        const markerNew = new google.maps.Marker({
            map: SVMap,
            position: { lat, lng },
            icon: generateSvgMapMarker('f21818')
        });
    }

    function generateSvgMapMarker(color) {
        const icon = `data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='28px' height='61px' viewBox='0 0 28 61' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3EIcon-Pink%3C/title%3E%3Cg id='Icon-Pink' stroke='none' stroke-width='1' fill='none' fill-rule='evenodd'%3E%3Cpath d='M15.5093388,20.7281993 C14.9275251,20.9855232 14.2863961,21.1311947 13.6095035,21.1311947 C12.9326109,21.1311947 12.2914819,20.9855232 11.7096682,20.7281993 C10.0593063,19.997225 8.90701866,18.3486077 8.90701866,16.4278376 C8.90701866,13.8310471 11.012713,11.726225 13.6095035,11.726225 C16.206294,11.726225 18.3119883,13.8310471 18.3119883,16.4278376 C18.3119883,18.3486077 17.1597007,19.997225 15.5093388,20.7281993 M22.3271131,7.71022793 C17.5121036,2.89609069 9.70603111,2.89609069 4.89189387,7.71022793 C1.3713543,11.2307675 0.437137779,16.3484597 2.06482035,20.7281993 L2.05435293,20.7281993 L2.15379335,20.9820341 L2.20525812,21.113749 L11.1688519,44.0984412 L11.1758302,44.0984412 C11.5561462,45.0736551 12.4990855,45.7671211 13.6095035,45.7671211 C14.7190492,45.7671211 15.6619885,45.0736551 16.0431768,44.0984412 L16.0492828,44.0984412 L25.0128766,21.1163658 L25.0669582,20.9776726 L25.1637818,20.7281993 L25.1541867,20.7281993 C26.7818692,16.3484597 25.8476527,11.2307675 22.3271131,7.71022793 M13.6095035,50.6946553 C11.012713,50.6946553 8.90701866,52.7994774 8.90701866,55.3962679 C8.90701866,57.9939306 11.012713,60.099625 13.6095035,60.099625 C16.206294,60.099625 18.3119883,57.9939306 18.3119883,55.3962679 C18.3119883,52.7994774 16.206294,50.6946553 13.6095035,50.6946553' id='F' stroke='%23FFFFFF' fill='%23${color}'%3E%3C/path%3E%3C/g%3E%3C/svg%3E`;
        return icon;
    }

    // Unused function. Possible future development -- Identify all edits for a given Wayspot
    function findWayspotEdits(data) {
        const wayspotId = data.poiData.id;
        const wayspotEdits = [];

        for (const nomination of nominations) {
            if (nomination.poiData.id === wayspotId) {
                wayspotEdits.push(nomination);
            }
        }

        return wayspotEdits;
    }
}

init();
