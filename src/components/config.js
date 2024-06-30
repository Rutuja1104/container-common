const config = {
    "data": {
        "allowedContext": {
            "accountId": "462d45d3-7fef-4f18-9c2c-f16114667e22",
            "providerIds": [],
            "system": {
                "name": "practiceFusion",
                "properties": {}
            },
            "tenantIds": []
        },
        "dataMappings": [
            {
                "accountId": "462d45d3-7fef-4f18-9c2c-f16114667e22",
                "to": "A19956"
            },
            {
                "tenantId": "b070d4f0-1d92-446a-b3a1-875a317a3ca6",
                "to": "A66"
            },
            {
                "tenantId": "26",
                "to": "A26"
            },
            {
                "tenantId": "2",
                "to": "A2"
            },
            {
                "providerId": "Rutuja Sahare",
                "to": "187569342"
            },
            {
                "providerId": "Rutuja Sahare-new",
                "to": "165782439"
            }
        ],
        "workflow": {
            "launchToken": {
                "secret": null,
                "type": "insiteflow-specific-jwe"
            },
            "supportedMethods": [
                {
                    "baseUrl": "https://en.wikipedia.org/wiki/Special:Search?go=Go&search=",
                    "contextEvents": [
                        "patient_view"
                    ],
                    "name": "get-notification-data-for-user-context",
                    "params": [
                        {
                            "name": "accountId",
                            "nullable": false,
                            "type": "text",
                            "value": "${accountId}"
                        },
                        {
                            "name": "providerId",
                            "nullable": false,
                            "type": "text",
                            "value": "${providerId}"
                        },
                        {
                            "name": "patientId",
                            "nullable": false,
                            "type": "text",
                            "value": "${patientId}"
                        }
                    ]
                },
                {
                    "baseUrl": "https://ib-api.dev.insiteflow.io",
                    "contextEvents": [
                        "provider_login",
                        "provider_view",
                        "patient_view",
                        "patient_chart_view"
                    ],
                    "name": "get-counts-for-user-context",
                    "params": [
                        {
                            "name": "accountId",
                            "nullable": false,
                            "type": "text",
                            "value": "${accountId}"
                        },
                        {
                            "name": "providerId",
                            "nullable": false,
                            "type": "text",
                            "value": "${providerId}"
                        }
                    ]
                }
            ],
            "system": "babylon"
        }
    },
    "eventExpiryTimeout": 10,
    "launch": {
        "eventLaunchUrls": {
            "patient_chart_view": "https://en.wikipedia.org/wiki/Special:Search?go=Go&search=",
            "patient_encounter_view": "https://en.wikipedia.org/wiki/Special:Search?go=Go&search=",
            "patient_view": "https://en.wikipedia.org/wiki/Special:Search?go=Go&search=",
            "provider_login": "https://en.wikipedia.org/wiki/Special:Search?go=Go&search=",
            "provider_logout": "",
            "provider_view": "https://en.wikipedia.org/wiki/Special:Search?go=Go&search=",
            "template": "{base}?token={jwe}"
        },
        "tokenAudience": "https://practiceFusion.com/sidecar"
    },
    "layout": {
        "notifications": {
            "enabled": true,
            "properties": {
                "backgroundColor": "black",
                "color": "white",
                "description": "Insiteflow/Browser Extensions.",
                "fontSize": "12",
                "height": "90",
                "notificationsIcon": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuVcgWQT7mrjvBK36n3v36mdFZCz6r8JZrK6_MC2uc8A&s",
                "width": "320",
                "x": "0",
                "y": "0"
            }
        },
        "viewport": {
            "alwaysOn": true,
            "properties": {
                "icon": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuVcgWQT7mrjvBK36n3v36mdFZCz6r8JZrK6_MC2uc8A&s",
                "tabBackgroundColor": "#fff",
                "tabHeightWithViewport": "75px",
                "tabHeightWithoutViewport": "35px",
                "tabWidthWithViewport": "35px",
                "tabWidthWithoutViewport": "75px",
                "viewportHeight": "500px",
                "viewportWidth": "365px",
                "x": "0",
                "y": "0"
            },
            "showCounts": true
        }
    }
}

export const configViewportDetails = config.layout.viewport;
export const configToastDetails = config.layout.notifications;