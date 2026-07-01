import type { PluginDescriptor, PluginHooks, PluginInput } from "@ericsanchezok/synergy-plugin";
import { workflowRouteTool } from "./tools/routeWorkflow";
import { devChangeCommand } from "./commands/devChange";

const plugin: PluginDescriptor = {
  id: "synergy-workflow-router",
  name: "Workflow Router",
  async init(_input: PluginInput): Promise<PluginHooks> {
    return {
      tool: {
        workflow_route: workflowRouteTool,
      },
      cli: {
        "dev-change": devChangeCommand,
      },
    };
  },
};

export default plugin;
