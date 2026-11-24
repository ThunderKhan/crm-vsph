import { prisma } from "../lib/prisma.js";
import { getTenantFilter } from "../middleware/auth.middleware.js";
import { validateContactEntry, validateLinkedOpportunity, RELATIONSHIP_STAGES } from "../lib/contactActivities.js";

const activeContact = req => prisma.contact.findFirst({
  where: {contact_id:req.params.id,contact_deleted_at:null,...getTenantFilter(req)},
  select: {contact_id:true,tenant_fk:true,contact_account_fk:true},
});

export async function getContactEntries(req,res) {
  try {
    const contact=await activeContact(req);
    if (!contact) return res.status(404).json({success:false,message:"Contact not found."});
    const page=Math.max(1,Math.min(100000,Math.trunc(Number(req.query.page)||1)));
    const limit=Math.max(1,Math.min(100,Math.trunc(Number(req.query.limit)||100)));
    const where={tenant_fk:contact.tenant_fk,contact_fk:contact.contact_id};
    const [data,total]=await Promise.all([
      prisma.contact_activity_entry.findMany({where,skip:(page-1)*limit,take:limit,orderBy:[{entry_occurred_at:"desc"},{entry_id:"desc"}],include:{user:{select:{user_id:true,user_name:true}}}}),
      prisma.contact_activity_entry.count({where}),
    ]);
    res.json({success:true,data,pagination:{totalPages:Math.ceil(total/limit)}});
  } catch(error) {
    console.error("Contact activity read failed",error);
    res.status(500).json({success:false,message:"Could not load communication history."});
  }
}

export async function createContactEntry(req,res) {
  try {
    const validation=validateContactEntry(req.body);
    if(validation.error)return res.status(400).json({success:false,message:validation.error});
    const contact=await activeContact(req);
    if(!contact)return res.status(404).json({success:false,message:"Contact not found."});
    const data=await prisma.contact_activity_entry.create({
      data:{...validation.data,tenant_fk:contact.tenant_fk,contact_fk:contact.contact_id,user_fk:req.user.id},
      include:{user:{select:{user_id:true,user_name:true}}},
    });
    res.status(201).json({success:true,data});
  } catch(error) {
    console.error("Contact activity write failed",error);
    res.status(500).json({success:false,message:"Could not save activity."});
  }
}

export async function updateRelationship(req,res) {
  try {
    const stage=req.body.contact_relationship_stage;
    if(stage!==null&&!RELATIONSHIP_STAGES.includes(stage))return res.status(400).json({success:false,message:"Invalid relationship stage."});
    const contact=await activeContact(req);
    if(!contact)return res.status(404).json({success:false,message:"Contact not found."});
    const result=await prisma.contact.update({where:{contact_id:contact.contact_id,tenant_fk:contact.tenant_fk,contact_deleted_at:null},data:{contact_relationship_stage:stage},select:{contact_relationship_stage:true}});
    res.json({success:true,data:result});
  }catch(error){
    console.error("Relationship update failed",error);
    res.status(500).json({success:false,message:"Could not update relationship."});
  }
}

const opportunityInclude={opportunity_owner:{select:{user_id:true,user_name:true}}};
export async function saveLinkedOpportunity(req,res) {
  try {
    const validation=validateLinkedOpportunity(req.body);
    if(validation.error)return res.status(400).json({success:false,message:validation.error});
    const contact=await activeContact(req);
    if(!contact)return res.status(404).json({success:false,message:"Contact not found."});
    const {opportunityId}=req.params;
    const where={tenant_fk:contact.tenant_fk,opportunity_contact_fk:contact.contact_id};
    if(opportunityId){
      const result=await prisma.opportunity.updateMany({where:{...where,opportunity_id:opportunityId},data:validation.data});
      if(!result.count)return res.status(404).json({success:false,message:"Linked opportunity not found."});
      const data=await prisma.opportunity.findFirst({where:{...where,opportunity_id:opportunityId},include:opportunityInclude});
      return res.json({success:true,data});
    }
    const owner=await prisma.user.findFirst({where:{user_id:req.user.id,tenant_fk:contact.tenant_fk,user_deleted_at:null,user_status:true},select:{user_id:true}});
    if(!owner)return res.status(403).json({success:false,message:"An active user in the contact organization must own the opportunity."});
    const data=await prisma.opportunity.create({data:{...validation.data,...where,opportunity_account_fk:contact.contact_account_fk,opportunity_owner_fk:owner.user_id},include:opportunityInclude});
    res.status(201).json({success:true,data});
  }catch(error){
    console.error("Linked opportunity save failed",error);
    res.status(500).json({success:false,message:"Could not save opportunity."});
  }
}
