import { SchemaObject } from "types";

export default class Schema {
    public table: SchemaObject[] = [];
    private name: string = "none";

    public boolean(str: string) {
        this.name = str;
        this.table.push({ name: str, type: "boolean", primary: false });

        return this;
    }

    public object(str: string) {
        this.name = str;
        this.table.push({ name: str, type: "object", primary: false });

        return this;
    }

    public array(str: string) {
        this.name = str;
        this.table.push({ name: str, type: "array", primary: false });

        return this;
    }

    public number(str: string) {
        this.name = str;
        this.table.push({ name: str, type: "number", primary: false });

        return this;
    }
    public string(str: string) {
        this.name = str;
        this.table.push({ name: str, type: "string", primary: false });

        return this;
    }

    public primary() {
        if ( this.name === "none" )
            throw new Error("first define name and type");

        this.table
            .filter(x => x?.name == this.name)
            .forEach(x => {
                let primaryExists = false;

                if ( !x ) 
                    return;

                this.table.forEach((x) => {
                    if (x?.primary == true)
                        primaryExists = true;
                });

                if ( !primaryExists )
                    x.primary = true;
                else
                    throw new Error("ya existe una propiedad con la propiedad primaria");
            }); 
    }
}