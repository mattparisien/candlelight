import { v4 as uuid_v4 } from "uuid";

interface IPluginService {}

abstract class PluginService implements IPluginService {
  private id: string = uuid_v4();
  abstract init(): void;

  constructor(id?: string) {
    if (id) this.id = id;
  }

  getId() {
    return this.id;
  }
}

export default PluginService;
