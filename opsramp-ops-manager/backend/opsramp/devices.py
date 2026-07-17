from typing import Any

from config import settings
from opsramp.client import MOCK_DEVICES, MOCK_TAGS, client


def list_tags() -> list[dict[str, Any]]:
    if settings.opsramp_mock:
        return MOCK_TAGS

    data = client.request(
        "GET",
        f"/api/v3/tenants/{client.tenant_id}/tags",
        params={"pageSize": 200},
    )
    return data.get("results", [])


def search_devices(query: str) -> list[dict[str, Any]]:
    if settings.opsramp_mock:
        q = query.lower()
        return [
            d
            for d in MOCK_DEVICES
            if q in d["name"].lower()
            or q in d.get("hostName", "").lower()
            or q in d.get("ipAddress", "")
        ]

    data = client.request(
        "GET",
        f"/api/v2/tenants/{client.tenant_id}/resources/search",
        params={"query": query, "pageSize": 50},
    )
    results = data.get("results", [])
    return [
        {
            "id": r.get("id") or r.get("uuid"),
            "name": r.get("name") or r.get("resourceName"),
            "hostName": r.get("hostName"),
            "ipAddress": r.get("ipAddress"),
            "resourceType": r.get("resourceType") or r.get("type"),
            "tags": r.get("tags", []),
        }
        for r in results
    ]


def get_tag_values(tag_id: str) -> list[dict[str, Any]]:
    if settings.opsramp_mock:
        values = {
            "tag-1": [{"uniqueId": "val-1", "value": "AT-001"}, {"uniqueId": "val-2", "value": "AT-002"}],
            "tag-2": [{"uniqueId": "val-3", "value": "Production"}, {"uniqueId": "val-4", "value": "Staging"}],
            "tag-3": [{"uniqueId": "val-5", "value": "Platform Team"}],
        }
        return values.get(tag_id, [])

    data = client.request(
        "GET",
        f"/api/v3/tenants/{client.tenant_id}/tags/{tag_id}/values",
        params={"pageSize": 200},
    )
    return data.get("results", [])


def create_tag_value(tag_id: str, value: str) -> dict[str, Any]:
    if settings.opsramp_mock:
        return {"uniqueId": f"val-new-{value}", "value": value}

    return client.request(
        "POST",
        f"/api/v3/tenants/{client.tenant_id}/tags/{tag_id}/values",
        json={"value": value},
    )


def assign_tag_to_resource(tag_id: str, value_id: str, resource_id: str) -> None:
    if settings.opsramp_mock:
        for device in MOCK_DEVICES:
            if device["id"] == resource_id:
                tag_name = next((t["name"] for t in MOCK_TAGS if t["uniqueId"] == tag_id), tag_id)
                value = next(
                    (v["value"] for v in get_tag_values(tag_id) if v["uniqueId"] == value_id),
                    value_id,
                )
                device["tags"] = [t for t in device.get("tags", []) if t["name"] != tag_name]
                device["tags"].append({"name": tag_name, "value": value})
                return
        raise ValueError("Device not found")

    client.request(
        "POST",
        f"/api/v3/tenants/{client.tenant_id}/tags/{tag_id}/values/{value_id}/tagged-entities",
        json={"entityType": "RESOURCES", "entityIds": [resource_id]},
    )


def set_device_attribute(resource_id: str, attribute_name: str, attribute_value: str) -> dict[str, Any]:
    tags = list_tags()
    tag = next((t for t in tags if t.get("name") == attribute_name), None)
    if not tag:
        raise ValueError(f"Custom attribute '{attribute_name}' not found")

    tag_id = tag.get("uniqueId") or tag.get("id")
    values = get_tag_values(tag_id)
    value_entry = next((v for v in values if v.get("value") == attribute_value), None)

    if not value_entry:
        value_entry = create_tag_value(tag_id, attribute_value)

    value_id = value_entry.get("uniqueId") or value_entry.get("id")
    assign_tag_to_resource(tag_id, value_id, resource_id)

    return {
        "resourceId": resource_id,
        "attributeName": attribute_name,
        "attributeValue": attribute_value,
    }
