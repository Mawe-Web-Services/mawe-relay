import { IHibernateResponse } from "./IHibernateResponse";

export interface IActivateResponse extends IHibernateResponse {
    tunnelUrl:string;
}