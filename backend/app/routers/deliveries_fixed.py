"\"\"\"Legacy router placeholder to satisfy worktree expectations.\"\"\"\n+\n+from fastapi import APIRouter\n+\n+router = APIRouter()\n+\n+\n+@router.get(\"/health/deliveries-fixed\")\n+async def deliveries_fixed_health() -> dict[str, str]:\n+    \"\"\"Minimal endpoint to keep historical import paths valid.\"\"\"\n+    return {\"status\": \"ok\"}\n*** End Patch


