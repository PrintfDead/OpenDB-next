export type ErrorClient = string | number | object | undefined;

export type ClientOptions = {
	Path?: string,
	Buffer?: number
}

export type Pointer = {
	ID: string,
	Reference: string | number,
	Containers: string[]
}

export type AnyArray = object[] | string[] | number[];

export type ResolvableType = string | number | AnyArray | object | boolean;

export type Container = 
{
	ID: string,
	Tables: TableType[]
}

export type TableType = 
{
	ID: number | string,
	Name: string,
	$: SchemaObject[]
}

export type PredicateType<T> = (value?: T, index?: number, array?: T[]) => unknown;

export type SchemaObject = {
    name: string
    type: string
    primary: boolean
	value?: ResolvableType
}